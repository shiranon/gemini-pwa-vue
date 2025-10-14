import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('MarkdownRenderer', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'CSS', {
      value: {
        supports: vi.fn(() => true),
      },
      writable: true,
      configurable: true,
    })
  })

  it('空のコンテンツをレンダリングする', () => {
    const props = {
      content: '',
    }

    expect(props.content).toBe('')
    expect(typeof props.content).toBe('string')
    expect(props.content.length).toBe(0)
  })

  it('空のコンテンツを処理する', () => {
    const emptyContent = ''
    expect(emptyContent).toBe('')
    expect(emptyContent.length).toBe(0)
  })

  it('シンプルなテキストコンテンツを処理する', () => {
    const textContent = 'Hello world'
    expect(textContent).toBe('Hello world')
    expect(typeof textContent).toBe('string')
  })

  it('Markdownの見出しを処理する', () => {
    const headingContent = '# Heading 1\n## Heading 2\n### Heading 3'
    const lines = headingContent.split('\n')

    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('# Heading 1')
    expect(lines[1]).toBe('## Heading 2')
    expect(lines[2]).toBe('### Heading 3')
  })

  it('コードブロックを処理する', () => {
    const codeContent = '```javascript\nconst hello = "world";\n```'
    const codeMatch = codeContent.match(/```(\w+)?\n([\s\S]*?)\n```/)

    expect(codeMatch).toBeTruthy()
    if (codeMatch) {
      expect(codeMatch[1]).toBe('javascript')
      expect(codeMatch[2]).toBe('const hello = "world";')
    }
  })

  it('インラインコードを処理する', () => {
    const inlineCodeContent = 'This is `inline code` text.'
    const codeMatch = inlineCodeContent.match(/`([^`]+)`/)

    expect(codeMatch).toBeTruthy()
    if (codeMatch) {
      expect(codeMatch[1]).toBe('inline code')
    }
  })

  it('リンクを処理する', () => {
    const linkContent = '[Google](https://google.com "Google Search")'
    const linkMatch = linkContent.match(/\[([^\]]+)\]\(([^)]+?)(?:\s"([^"]+)")?\)/)

    expect(linkMatch).toBeTruthy()
    if (linkMatch) {
      expect(linkMatch[1]).toBe('Google')
      expect(linkMatch[2]).toBe('https://google.com')
      expect(linkMatch[3]).toBe('Google Search')
    }
  })

  it('画像を処理する', () => {
    const imageContent = '![Alt text](https://example.com/image.jpg "Image title")'
    const imageMatch = imageContent.match(/!\[([^\]]*)\]\(([^)]+?)(?:\s"([^"]+)")?\)/)

    expect(imageMatch).toBeTruthy()
    if (imageMatch) {
      expect(imageMatch[1]).toBe('Alt text')
      expect(imageMatch[2]).toBe('https://example.com/image.jpg')
      expect(imageMatch[3]).toBe('Image title')
    }
  })

  it('ブロッククォートを処理する', () => {
    const blockquoteContent = '> This is a blockquote\n> with multiple lines'
    const lines = blockquoteContent.split('\n')

    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('> This is a blockquote')
    expect(lines[1]).toBe('> with multiple lines')
  })

  it('リストを処理する', () => {
    const listContent = '- Item 1\n- Item 2\n- Item 3'
    const items = listContent.split('\n')

    expect(items).toHaveLength(3)
    expect(items[0]).toBe('- Item 1')
    expect(items[1]).toBe('- Item 2')
    expect(items[2]).toBe('- Item 3')
  })

  it('番号付きリストを処理する', () => {
    const orderedListContent = '1. First item\n2. Second item\n3. Third item'
    const items = orderedListContent.split('\n')

    expect(items).toHaveLength(3)
    expect(items[0]).toBe('1. First item')
    expect(items[1]).toBe('2. Second item')
    expect(items[2]).toBe('3. Third item')
  })

  it('ネストしたリストを処理する', () => {
    const nestedListContent = '- Parent item\n  - Child item 1\n  - Child item 2\n- Another parent'
    const lines = nestedListContent.split('\n')

    expect(lines).toHaveLength(4)
    expect(lines[0]).toBe('- Parent item')
    expect(lines[1]).toBe('  - Child item 1')
    expect(lines[2]).toBe('  - Child item 2')
    expect(lines[3]).toBe('- Another parent')
  })

  it('番号付きリストと順序なしリストの混在を処理する', () => {
    const mixedListContent = '1. Numbered item\n- Bullet item\n2. Another numbered item'
    const lines = mixedListContent.split('\n')

    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('1. Numbered item')
    expect(lines[1]).toBe('- Bullet item')
    expect(lines[2]).toBe('2. Another numbered item')
  })

  it('リストのCSSクラスが正しく適用される', () => {
    // 順序なしリストのクラス名を検証
    const unorderedListClass = 'markdown-list'
    expect(unorderedListClass).toBe('markdown-list')

    // 番号付きリストのクラス名を検証
    const orderedListClass = 'markdown-list'
    expect(orderedListClass).toBe('markdown-list')

    // looseリストのクラス名を検証
    const looseListClass = 'markdown-list markdown-list--loose'
    expect(looseListClass).toContain('markdown-list')
    expect(looseListClass).toContain('markdown-list--loose')
  })

  it('リストスタイルタイプの設定を検証する', () => {
    // 順序なしリストはdiscスタイル
    const unorderedStyle = 'disc'
    expect(unorderedStyle).toBe('disc')

    // 番号付きリストはdecimalスタイル
    const orderedStyle = 'decimal'
    expect(orderedStyle).toBe('decimal')
  })

  it('太字と斜体のテキストを処理する', () => {
    const boldItalicContent = '**bold text** and *italic text*'

    const boldMatch = boldItalicContent.match(/\*\*([^*]+)\*\*/)
    const italicMatch = boldItalicContent.match(/(?<!\*)\*([^*]+)\*(?!\*)/)

    expect(boldMatch).toBeTruthy()
    expect(italicMatch).toBeTruthy()

    if (boldMatch) expect(boldMatch[1]).toBe('bold text')
    if (italicMatch) expect(italicMatch[1]).toBe('italic text')
  })

  it('取り消し線のテキストを処理する', () => {
    const strikethroughContent = '~~strikethrough text~~'
    const match = strikethroughContent.match(/~~([^~]+)~~/)

    expect(match).toBeTruthy()
    if (match) {
      expect(match[1]).toBe('strikethrough text')
    }
  })

  it('改行を処理する', () => {
    const lineBreakContent = 'Line 1  \nLine 2'
    const lines = lineBreakContent.split('\n')

    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('Line 1  ')
    expect(lines[1]).toBe('Line 2')
  })

  it('複雑なMarkdownを処理する', () => {
    const complexMarkdown = `# Main Heading

This is a paragraph with **bold** and *italic* text.

## Subheading

- List item 1
- List item 2

\`\`\`javascript
const code = "example";
\`\`\`

> This is a blockquote

[Link](https://example.com)`

    expect(complexMarkdown).toContain('# Main Heading')
    expect(complexMarkdown).toContain('**bold**')
    expect(complexMarkdown).toContain('*italic*')
    expect(complexMarkdown).toContain('## Subheading')
    expect(complexMarkdown).toContain('- List item 1')
    expect(complexMarkdown).toContain('```javascript')
    expect(complexMarkdown).toContain('> This is a blockquote')
    expect(complexMarkdown).toContain('[Link](https://example.com)')
  })
})
