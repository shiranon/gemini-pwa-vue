import type { Tokens } from 'marked'
import { marked } from 'marked'
import { logger } from '~/utils/logger'

export interface MarkdownTextNode {
  type: 'text'
  value: string
}

export interface MarkdownBreakNode {
  type: 'break'
}

export interface MarkdownInlineCodeNode {
  type: 'inlineCode'
  value: string
}

export interface MarkdownStrongNode {
  type: 'strong'
  children: MarkdownInlineNode[]
}

export interface MarkdownEmphasisNode {
  type: 'emphasis'
  children: MarkdownInlineNode[]
}

export interface MarkdownDeleteNode {
  type: 'delete'
  children: MarkdownInlineNode[]
}

export interface MarkdownLinkNode {
  type: 'link'
  href: string
  title?: string | null
  children: MarkdownInlineNode[]
}

export interface MarkdownImageNode {
  type: 'image'
  src: string
  alt?: string
  title?: string | null
}

export interface MarkdownCharacterImageNode {
  type: 'characterImage'
  characterName: string
  outfitName: string
  expression: string
  alt?: string
  title?: string | null
}

export interface MarkdownBackgroundDirectiveNode {
  type: 'backgroundDirective'
  categoryName: string
  imageName: string
}

export type MarkdownInlineNode =
  | MarkdownTextNode
  | MarkdownBreakNode
  | MarkdownInlineCodeNode
  | MarkdownStrongNode
  | MarkdownEmphasisNode
  | MarkdownDeleteNode
  | MarkdownLinkNode
  | MarkdownImageNode
  | MarkdownCharacterImageNode
  | MarkdownBackgroundDirectiveNode

export interface MarkdownParagraphNode {
  type: 'paragraph'
  children: MarkdownInlineNode[]
}

export interface MarkdownHeadingNode {
  type: 'heading'
  depth: number
  children: MarkdownInlineNode[]
}

export interface MarkdownCodeBlockNode {
  type: 'code'
  language?: string
  value: string
}

export interface MarkdownBlockquoteNode {
  type: 'blockquote'
  children: MarkdownBlockNode[]
}

export interface MarkdownListItemNode {
  type: 'listItem'
  children: MarkdownBlockNode[]
}

export interface MarkdownListNode {
  type: 'list'
  ordered: boolean
  loose: boolean
  items: MarkdownListItemNode[]
}

export interface MarkdownFigureNode {
  type: 'figure'
  src: string
  alt?: string
  title?: string | null
}

export interface MarkdownThematicBreakNode {
  type: 'thematicBreak'
}

export type MarkdownBlockNode = MarkdownParagraphNode | MarkdownHeadingNode | MarkdownCodeBlockNode | MarkdownBlockquoteNode | MarkdownListNode | MarkdownFigureNode | MarkdownThematicBreakNode

const markedOptions = {
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
}

type TokensList = Tokens.Generic[]

/**
 * Markdownテキストを安全にレンダリング可能なノードへ変換する
 */
export const parseMarkdown = (content: string): MarkdownBlockNode[] => {
  if (!content) {
    return []
  }

  try {
    const tokens = marked.lexer(content, markedOptions)
    console.log('[DEBUG markdown.ts] marked.lexer結果:', JSON.stringify(tokens, null, 2))
    return transformBlockTokens(tokens)
  } catch (error) {
    logger.warn('Markdownの解析に失敗しました:', { component: 'markdown' }, error)
    return [
      {
        type: 'paragraph',
        children: [{ type: 'text', value: content }],
      },
    ]
  }
}

const transformBlockTokens = (tokens: TokensList): MarkdownBlockNode[] => {
  const result: MarkdownBlockNode[] = []

  for (const token of tokens) {
    switch (token.type) {
      case 'space':
        continue
      case 'paragraph': {
        const inlineNodes = transformInlineTokens(token.tokens)
        const figure = inlineNodes ? maybeConvertToFigure(inlineNodes) : null
        if (figure) {
          result.push(figure)
        } else if (inlineNodes && inlineNodes.length > 0) {
          result.push({ type: 'paragraph', children: inlineNodes })
        }
        break
      }
      case 'heading': {
        const inlineNodes = transformInlineTokens(token.tokens)
        result.push({
          type: 'heading',
          depth: Math.min(6, token.depth ?? 1),
          children: inlineNodes ?? [],
        })
        break
      }
      case 'code': {
        result.push({
          type: 'code',
          language: token.lang ?? undefined,
          value: token.text ?? '',
        })
        break
      }
      case 'blockquote': {
        result.push({
          type: 'blockquote',
          children: transformBlockTokens(token.tokens ?? []),
        })
        break
      }
      case 'list': {
        const items = (token.items ?? []).map((item: Tokens.ListItem) => ({
          type: 'listItem' as const,
          children: transformBlockTokens(item.tokens ?? []),
        }))
        result.push({
          type: 'list',
          ordered: Boolean(token.ordered),
          loose: Boolean(token.loose),
          items,
        })
        break
      }
      case 'hr': {
        result.push({ type: 'thematicBreak' })
        break
      }
      case 'html': {
        const value = (token.text ?? token.raw ?? '').trim()
        if (value) {
          result.push({
            type: 'paragraph',
            children: [{ type: 'text', value }],
          })
        }
        break
      }
      case 'text': {
        const inlineTokens = 'tokens' in token ? token.tokens : undefined
        const inlineNodes = transformInlineTokens(inlineTokens)
        if (inlineNodes && inlineNodes.length > 0) {
          result.push({ type: 'paragraph', children: inlineNodes })
        }
        break
      }
      default: {
        const fallback = (token.raw ?? '').trim()
        if (fallback) {
          result.push({
            type: 'paragraph',
            children: [{ type: 'text', value: fallback }],
          })
        }
      }
    }
  }

  return result
}

const transformInlineTokens = (tokens?: TokensList): MarkdownInlineNode[] => {
  if (!tokens || tokens.length === 0) {
    return []
  }

  const result: MarkdownInlineNode[] = []

  for (const token of tokens) {
    switch (token.type) {
      case 'text': {
        if ('tokens' in token && token.tokens) {
          result.push(...transformInlineTokens(token.tokens))
        } else if (token.text) {
          console.log('[DEBUG markdown.ts] token.text:', token.text)
          // カスタム画像表記と背景ディレクティブを検出して変換
          const transformed = transformTextWithDirectives(token.text)
          console.log('[DEBUG markdown.ts] transformed:', transformed)
          result.push(...transformed)
        }
        break
      }
      case 'escape': {
        if (token.text) {
          result.push({ type: 'text', value: token.text })
        }
        break
      }
      case 'strong': {
        result.push({ type: 'strong', children: transformInlineTokens(token.tokens) })
        break
      }
      case 'em': {
        result.push({ type: 'emphasis', children: transformInlineTokens(token.tokens) })
        break
      }
      case 'codespan': {
        result.push({ type: 'inlineCode', value: token.text ?? '' })
        break
      }
      case 'del': {
        result.push({ type: 'delete', children: transformInlineTokens(token.tokens) })
        break
      }
      case 'br': {
        result.push({ type: 'break' })
        break
      }
      case 'link': {
        const href = sanitizeUrl(token.href)
        if (href) {
          result.push({
            type: 'link',
            href,
            title: token.title ?? null,
            children: transformInlineTokens(token.tokens),
          })
        } else {
          result.push(...transformInlineTokens(token.tokens))
        }
        break
      }
      case 'image': {
        const src = token.href || ''

        // カスタム画像表記かどうかをチェック
        if (src.startsWith(':character/')) {
          const characterImage = parseCharacterImageNotation(`![${token.text ?? ''}](${src})`)
          if (characterImage) {
            result.push(characterImage)
            break
          }
        }

        // 通常の画像処理
        const sanitizedSrc = sanitizeUrl(src)
        if (sanitizedSrc) {
          result.push({
            type: 'image',
            src: sanitizedSrc,
            alt: token.text ?? '',
            title: token.title ?? null,
          })
        }
        break
      }
      case 'html': {
        if (token.text) {
          result.push({ type: 'text', value: token.text })
        }
        break
      }
      default: {
        const fallback = token.raw ?? token.text
        if (fallback) {
          result.push({ type: 'text', value: fallback })
        }
      }
    }
  }

  return mergeAdjacentTextNodes(result)
}

const PLACEHOLDER_ORIGIN = 'http://example.com'
const PLACEHOLDER_URL = new URL(PLACEHOLDER_ORIGIN)

const sanitizeUrl = (url?: string): string | null => {
  if (!url) return null
  if (url.startsWith('#')) {
    return url
  }

  try {
    const parsed = new URL(url, PLACEHOLDER_ORIGIN)

    if (parsed.origin === PLACEHOLDER_URL.origin) {
      const relative = `${parsed.pathname}${parsed.search}${parsed.hash}`
      return relative || '/'
    }

    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href
    }

    return null
  } catch {
    return null
  }
}

const maybeConvertToFigure = (nodes: MarkdownInlineNode[]): MarkdownFigureNode | null => {
  const meaningful = nodes.filter((node) => {
    if (node.type === 'text') {
      return node.value.trim().length > 0
    }
    if (node.type === 'break') {
      return false
    }
    return true
  })

  if (meaningful.length !== 1) {
    return null
  }

  const first = meaningful[0]
  if (!first || first.type !== 'image') {
    return null
  }

  return {
    type: 'figure',
    src: first.src,
    alt: first.alt,
    title: first.title ?? null,
  }
}

const mergeAdjacentTextNodes = (nodes: MarkdownInlineNode[]): MarkdownInlineNode[] => {
  if (nodes.length < 2) return nodes

  const merged: MarkdownInlineNode[] = []
  for (const node of nodes) {
    const last = merged[merged.length - 1]
    if (last && last.type === 'text' && node.type === 'text') {
      last.value += node.value
    } else {
      merged.push(node)
    }
  }
  return merged
}

/**
 * カスタム画像表記を検出してパースする
 * 例: ![C](:character/キャラクター名/衣装/expression)
 */
const parseCharacterImageNotation = (text: string): MarkdownCharacterImageNode | null => {
  const pattern = /!\[([^\]]*)\]\(:character\/([^/]+)\/([^/]+)\/([^)]+)\)/
  const match = text.match(pattern)

  if (!match) {
    // カスタム画像表記のパターンにマッチしない場合はログ出力しない（通常のテキストの可能性があるため）
    return null
  }

  const [, alt, characterName, outfitName, expression] = match

  // 必要な部分がすべて存在することを確認
  if (!characterName || !outfitName || !expression) {
    logger.warn(`Invalid character image format: ${text}`, { component: 'markdown' })
    return null
  }

  return {
    type: 'characterImage',
    characterName: characterName.trim(),
    outfitName: outfitName.trim(),
    expression: expression.trim(),
    alt: alt || undefined,
    title: null,
  }
}

/**
 * テキストノードをカスタム画像表記を含むノードに変換する
 */
const transformTextWithCharacterImages = (text: string): MarkdownInlineNode[] => {
  const characterImage = parseCharacterImageNotation(text)

  if (characterImage) {
    // カスタム画像表記が見つかった場合、その部分を置換
    const pattern = /!\[([^\]]*)\]\(:character\/([^/]+)\/([^/]+)\/([^)]+)\)/
    const parts = text.split(pattern)
    const result: MarkdownInlineNode[] = []

    for (let i = 0; i < parts.length; i++) {
      if (i % 5 === 0) {
        // テキスト部分
        if (parts[i]) {
          result.push({ type: 'text', value: parts[i]! })
        }
      } else if (i % 5 === 1) {
        // カスタム画像表記の部分
        const alt = parts[i] || ''
        const characterName = parts[i + 1] || ''
        const outfitName = parts[i + 2] || ''
        const expression = parts[i + 3] || ''

        if (characterName && outfitName && expression) {
          result.push({
            type: 'characterImage',
            characterName: characterName.trim(),
            outfitName: outfitName.trim(),
            expression: expression.trim(),
            alt: alt || undefined,
            title: null,
          })
        } else {
          // パースに失敗した場合はエラーメッセージを表示
          const originalText = `![${alt}](${characterName}/${outfitName}/${expression})`
          logger.warn(`Invalid character image format: ${originalText}`, { component: 'markdown' })
          result.push({
            type: 'text',
            value: `[画像形式エラー: ${originalText}]`,
          })
        }

        // 次の3つの要素をスキップ（既に処理済み）
        i += 3
      }
    }

    return result
  }

  // カスタム画像表記が見つからない場合は通常のテキストノード
  return [{ type: 'text', value: text }]
}

/**
 * テキストノードを背景ディレクティブを含むノードに変換する
 * 対応形式: (!BG: background/...) または (!BG :background/...)
 */
const transformTextWithDirectives = (text: string): MarkdownInlineNode[] => {
  console.log('[DEBUG transformTextWithDirectives] input text:', text)
  const pattern = /\(!BG\s*:\s*background\/([^/]+)\/([^)]+)\)/g
  console.log('[DEBUG transformTextWithDirectives] pattern:', pattern)
  const parts: string[] = []
  const directives: MarkdownBackgroundDirectiveNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  // 全てのディレクティブを検出
  while ((match = pattern.exec(text)) !== null) {
    console.log('[DEBUG transformTextWithDirectives] match found:', match)
    // ディレクティブの前のテキスト部分を追加
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    // ディレクティブを追加
    const categoryName = match[1]?.trim()
    const imageName = match[2]?.trim()
    console.log('[DEBUG transformTextWithDirectives] categoryName:', categoryName, 'imageName:', imageName)

    if (categoryName && imageName) {
      directives.push({
        type: 'backgroundDirective',
        categoryName,
        imageName,
      })
      console.log('[DEBUG transformTextWithDirectives] directive added, directives.length:', directives.length)
    } else {
      logger.warn(`Invalid background directive format: ${match[0]}`, { component: 'markdown' })
    }

    lastIndex = pattern.lastIndex
  }

  console.log('[DEBUG transformTextWithDirectives] after loop - directives.length:', directives.length, 'parts.length:', parts.length)

  // 最後のディレクティブの後のテキスト部分を追加
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  // ディレクティブが見つからない場合は、キャラクター画像のパースを試みる
  if (directives.length === 0) {
    console.log('[DEBUG transformTextWithDirectives] no directives found, falling back to character images')
    return transformTextWithCharacterImages(text)
  }

  // 結果を構築
  const result: MarkdownInlineNode[] = []

  // テキスト部分とディレクティブを交互に追加
  const maxLength = Math.max(parts.length, directives.length)
  for (let i = 0; i < maxLength; i++) {
    // テキスト部分を追加
    if (i < parts.length && parts[i]) {
      result.push(...transformTextWithCharacterImages(parts[i]!))
    }
    // ディレクティブを追加（非表示だが、後で抽出するために含める）
    if (i < directives.length) {
      result.push(directives[i]!)
    }
  }

  console.log('[DEBUG transformTextWithDirectives] final result:', result)
  return result
}
