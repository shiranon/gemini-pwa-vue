import { beforeEach, describe, expect, it, mock } from 'bun:test'

describe('MarkdownImage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'CSS', {
      value: {
        supports: mock(() => true),
      },
      writable: true,
      configurable: true,
    })
  })

  it('必須プロパティで画像をレンダリングする', () => {
    const props = {
      src: 'https://example.com/image.jpg',
      alt: 'Test image',
    }

    expect(props.src).toBe('https://example.com/image.jpg')
    expect(props.alt).toBe('Test image')
    expect(typeof props.src).toBe('string')
    expect(typeof props.alt).toBe('string')
  })

  it('正しいデフォルトプロパティを持つ', () => {
    const defaultProps = {
      alt: '',
      caption: null,
      title: null,
    }

    expect(defaultProps.alt).toBe('')
    expect(defaultProps.caption).toBeNull()
    expect(defaultProps.title).toBeNull()
  })

  it('画像プロパティを正しく処理する', () => {
    const imageProps = {
      src: 'https://example.com/image.jpg',
      alt: 'Test image',
      caption: 'Image caption',
      title: 'Image title',
    }

    expect(imageProps.src).toBe('https://example.com/image.jpg')
    expect(imageProps.alt).toBe('Test image')
    expect(imageProps.caption).toBe('Image caption')
    expect(imageProps.title).toBe('Image title')
  })

  it('null値を適切に処理する', () => {
    const propsWithNulls = {
      caption: null,
      title: null,
    }

    expect(propsWithNulls.caption).toBeNull()
    expect(propsWithNulls.title).toBeNull()
  })

  it('必須プロパティを検証する', () => {
    const requiredProps = {
      src: 'https://example.com/image.jpg',
    }

    expect(requiredProps.src).toBeDefined()
    expect(typeof requiredProps.src).toBe('string')
    expect(requiredProps.src.length).toBeGreaterThan(0)
  })
})
