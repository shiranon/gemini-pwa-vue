import { parseMarkdown, type MarkdownBlockNode, type MarkdownInlineNode } from '~/lib/markdown'
import { logger } from '~/utils/logger'

export interface BackgroundDirective {
  categoryName: string
  imageName: string
}

export interface BackgroundDirectiveExtractorOptions {
  maxDepth?: number
  enableCaching?: boolean
}

/**
 * 背景ディレクティブを抽出するための関数
 * 複雑なMarkdown解析処理を分離し、パフォーマンスを最適化
 */
export function backgroundDirectiveExtractor(options: BackgroundDirectiveExtractorOptions = {}) {
  const { maxDepth = 10, enableCaching = true } = options

  // パース結果のキャッシュ
  const parseCache = new Map<string, MarkdownBlockNode[]>()
  const directiveCache = new Map<string, BackgroundDirective | null>()

  /**
   * Markdownコンテンツから背景ディレクティブを抽出
   * キャッシュ機能付きでパフォーマンスを最適化
   */
  const extractDirectiveFromContent = (content: string): BackgroundDirective | null => {
    if (!content?.trim()) return null

    // キャッシュが有効な場合、既存の結果をチェック
    if (enableCaching && directiveCache.has(content)) {
      return directiveCache.get(content)!
    }

    try {
      // パース結果のキャッシュをチェック
      let nodes: MarkdownBlockNode[]
      if (enableCaching && parseCache.has(content)) {
        nodes = parseCache.get(content)!
      } else {
        nodes = parseMarkdown(content)
        if (enableCaching) {
          parseCache.set(content, nodes)
        }
      }

      const directive = findDirectiveInNodes(nodes, maxDepth)

      // 結果をキャッシュ
      if (enableCaching) {
        directiveCache.set(content, directive)
      }

      return directive
    } catch (error) {
      logger.error(
        '[backgroundDirectiveExtractor] ディレクティブ抽出エラー',
        {
          component: 'backgroundDirectiveExtractor',
        },
        error
      )
      return null
    }
  }

  /**
   * ノードから背景ディレクティブを検索
   * スタックベースの実装で深度制限を厳密に管理
   */
  const findDirectiveInNodes = (blockNodes: MarkdownBlockNode[], maxDepth: number): BackgroundDirective | null => {
    let lastDirective: BackgroundDirective | null = null

    const stack: Array<{
      nodes: MarkdownBlockNode[] | MarkdownInlineNode[]
      depth: number
      type: 'block' | 'inline'
    }> = []

    // 初期ノードをスタックに追加
    stack.push({ nodes: blockNodes, depth: 0, type: 'block' })

    while (stack.length > 0) {
      const current = stack.pop()!

      // 深度チェック
      if (current.depth > maxDepth) {
        logger.warn('[backgroundDirectiveExtractor] 再帰深度の上限に達しました', {
          component: 'backgroundDirectiveExtractor',
          depth: current.depth,
          type: current.type,
        })
        continue
      }

      if (current.type === 'block') {
        // ブロックノードの処理
        for (const node of current.nodes as MarkdownBlockNode[]) {
          if (node.type === 'paragraph' || node.type === 'heading') {
            // インラインノードをスタックに追加
            stack.push({ nodes: node.children, depth: current.depth, type: 'inline' })
          } else if (node.type === 'blockquote') {
            // ブロッククォートの子ノードをスタックに追加
            stack.push({ nodes: node.children, depth: current.depth + 1, type: 'block' })
          } else if (node.type === 'list') {
            // リストアイテムの子ノードをスタックに追加
            for (const item of node.items) {
              stack.push({ nodes: item.children, depth: current.depth + 1, type: 'block' })
            }
          }
        }
      } else {
        // インラインノードの処理
        for (const node of current.nodes as MarkdownInlineNode[]) {
          if (node.type === 'backgroundDirective') {
            lastDirective = {
              categoryName: node.categoryName,
              imageName: node.imageName,
            }
          } else if ('children' in node && Array.isArray(node.children)) {
            // 子ノードをスタックに追加
            stack.push({ nodes: node.children, depth: current.depth + 1, type: 'inline' })
          }
        }
      }
    }

    return lastDirective
  }

  /**
   * キャッシュをクリア
   */
  const clearCache = () => {
    parseCache.clear()
    directiveCache.clear()
  }

  /**
   * キャッシュサイズを取得
   */
  const getCacheSize = () => ({
    parseCache: parseCache.size,
    directiveCache: directiveCache.size,
  })

  return {
    extractDirectiveFromContent,
    clearCache,
    getCacheSize,
  }
}
