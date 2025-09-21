import type { Tokens } from 'marked'
import { marked } from 'marked'

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

export type MarkdownInlineNode = MarkdownTextNode | MarkdownBreakNode | MarkdownInlineCodeNode | MarkdownStrongNode | MarkdownEmphasisNode | MarkdownDeleteNode | MarkdownLinkNode | MarkdownImageNode

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
          result.push({ type: 'text', value: token.text })
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
        const src = sanitizeUrl(token.href)
        if (src) {
          result.push({
            type: 'image',
            src,
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
