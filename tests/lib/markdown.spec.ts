import { describe, expect, it } from 'vitest'
import { parseMarkdown } from '~/lib/markdown'

describe('parseMarkdown', () => {
  it('プレーンテキストを段落ノードにパースする', () => {
    const nodes = parseMarkdown('Hello world')
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({
      type: 'paragraph',
      children: [{ type: 'text', value: 'Hello world' }],
    })
  })

  it('言語メタデータ付きのフェンスコードブロックをパースする', () => {
    const markdown = ['```ts', 'const greet = (name: string) => {', "  console.log('Hello ' + name)", '}', '```'].join('\n')
    const nodes = parseMarkdown(markdown)

    expect(nodes[0]).toMatchObject({
      type: 'code',
      language: 'ts',
    })
    expect(nodes[0]?.type === 'code' ? nodes[0].value : '').toContain('const greet')
  })

  it('スタンドアロン画像をオプションのキャプション付きfigureノードに変換する', () => {
    const nodes = parseMarkdown('![Altだけ](https://example.com/sample.png "画像")')

    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({
      type: 'figure',
      src: 'https://example.com/sample.png',
      alt: 'Altだけ',
      title: '画像',
    })
  })

  it('生のHTMLコンテンツをテキストノードにエスケープする', () => {
    const nodes = parseMarkdown('<script>alert(1)</script>')

    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({
      type: 'paragraph',
      children: [{ type: 'text', value: '<script>alert(1)</script>' }],
    })
  })

  it('安全なリンクを保持しながら危険なリンクをフィルタリングする', () => {
    const nodes = parseMarkdown('[safe](https://example.com) [bad](javascript:alert(1))')

    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.type).toBe('paragraph')
    if (nodes[0]?.type === 'paragraph') {
      const link = nodes[0]?.children.find((child) => child.type === 'link')
      const text = nodes[0]?.children.filter((child) => child.type === 'text')

      expect(link).toMatchObject({ href: 'https://example.com/' })
      expect(text.some((child) => child.type === 'text' && child.value.includes('bad'))).toBe(true)
    }
  })

  it('外部リンクの完全なURLを保持する', () => {
    const nodes = parseMarkdown('[external](https://example.computer.dev/foo/bar?x=1#frag)')

    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.type).toBe('paragraph')
    if (nodes[0]?.type === 'paragraph') {
      const link = nodes[0]?.children.find((child) => child.type === 'link')
      expect(link).toMatchObject({ href: 'https://example.computer.dev/foo/bar?x=1#frag' })
    }
  })

  it('相対リンクをプレースホルダーの影響なしに保持する', () => {
    const nodes = parseMarkdown('[docs](/guide/start?from=chat#section)')

    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.type).toBe('paragraph')
    if (nodes[0]?.type === 'paragraph') {
      const link = nodes[0]?.children.find((child) => child.type === 'link')
      expect(link).toMatchObject({ href: '/guide/start?from=chat#section' })
    }
  })
})
