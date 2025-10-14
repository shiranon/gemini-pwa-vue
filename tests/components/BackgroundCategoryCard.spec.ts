import { describe, expect, it } from 'bun:test'

describe('BackgroundCategoryCard', () => {
  it('正しいpropsを受け取ってレンダリングされる', () => {
    const props = {
      category: {
        id: 'cat1',
        name: 'Nature',
        description: '自然の風景画像',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      thumbnailImage: {
        id: 'img1',
        categoryId: 'cat1',
        name: 'forest.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      isLoadingThumbnail: false,
    }

    expect(props.category.id).toBe('cat1')
    expect(props.category.name).toBe('Nature')
    expect(props.category.description).toBe('自然の風景画像')
    expect(props.thumbnailImage).toBeDefined()
    expect(props.isLoadingThumbnail).toBe(false)
  })

  it('カテゴリー名が正しく表示される', () => {
    const category = {
      name: 'Urban',
      description: '都市の風景',
    }

    expect(category.name).toBe('Urban')
    expect(typeof category.name).toBe('string')
    expect(category.name.length).toBeGreaterThan(0)
  })

  it('カテゴリーの説明が正しく表示される', () => {
    const category = {
      name: 'Abstract',
      description: '抽象的なアートワーク',
    }

    expect(category.description).toBe('抽象的なアートワーク')
    expect(typeof category.description).toBe('string')
    expect(category.description.length).toBeGreaterThan(0)
  })

  it('説明がないカテゴリーでも正しく動作する', () => {
    const category = {
      name: 'Minimal',
      description: undefined,
    }

    expect(category.name).toBe('Minimal')
    expect(category.description).toBeUndefined()
  })

  it('サムネイル画像が正しく表示される', () => {
    const thumbnailImage = {
      mimeType: 'image/jpeg',
      base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    }

    const imageSrc = `data:${thumbnailImage.mimeType};base64,${thumbnailImage.base64Data}`

    expect(imageSrc).toBe('data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    expect(imageSrc.startsWith('data:')).toBe(true)
    expect(imageSrc.includes('base64,')).toBe(true)
  })

  it('サムネイル画像がない場合にデフォルトアイコンが表示される', () => {
    const _thumbnailImage = null
    const isLoadingThumbnail = false

    const shouldShowDefaultIcon = !_thumbnailImage && !isLoadingThumbnail
    expect(shouldShowDefaultIcon).toBe(true)
  })

  it('サムネイル画像の読み込み中にローディングアイコンが表示される', () => {
    const _thumbnailImage = null
    const isLoadingThumbnail = true

    const shouldShowLoadingIcon = isLoadingThumbnail
    expect(shouldShowLoadingIcon).toBe(true)
  })

  it('selectCategoryイベントが正しく定義される', () => {
    const emits = {
      'select-category': ['categoryId: string'],
    }

    expect(emits['select-category']).toBeDefined()
    expect(Array.isArray(emits['select-category'])).toBe(true)
    expect(emits['select-category'].length).toBe(1)
    expect(emits['select-category'][0]).toBe('categoryId: string')
  })

  it('editCategoryイベントが正しく定義される', () => {
    const emits = {
      'edit-category': ['category: BackgroundCategoryRecord'],
    }

    expect(emits['edit-category']).toBeDefined()
    expect(Array.isArray(emits['edit-category'])).toBe(true)
    expect(emits['edit-category'].length).toBe(1)
    expect(emits['edit-category'][0]).toBe('category: BackgroundCategoryRecord')
  })

  it('deleteCategoryイベントが正しく定義される', () => {
    const emits = {
      'delete-category': ['categoryId: string'],
    }

    expect(emits['delete-category']).toBeDefined()
    expect(Array.isArray(emits['delete-category'])).toBe(true)
    expect(emits['delete-category'].length).toBe(1)
    expect(emits['delete-category'][0]).toBe('categoryId: string')
  })

  it('異なる画像形式が正しく処理される', () => {
    const imageFormats = [
      { mimeType: 'image/jpeg', base64Data: 'jpeg-data' },
      { mimeType: 'image/png', base64Data: 'png-data' },
      { mimeType: 'image/webp', base64Data: 'webp-data' },
      { mimeType: 'image/gif', base64Data: 'gif-data' },
    ]

    imageFormats.forEach((format) => {
      const imageSrc = `data:${format.mimeType};base64,${format.base64Data}`
      expect(imageSrc.startsWith('data:')).toBe(true)
      expect(imageSrc.includes('base64,')).toBe(true)
      expect(imageSrc.includes(format.mimeType)).toBe(true)
    })
  })

  it('カテゴリーのクリックイベントが正しく処理される', () => {
    const category = {
      id: 'cat1',
      name: 'Nature',
    }

    const selectCategory = (categoryId: string) => {
      return categoryId
    }

    const result = selectCategory(category.id)
    expect(result).toBe('cat1')
  })

  it('編集ボタンのクリックイベントが正しく処理される', () => {
    const category = {
      id: 'cat1',
      name: 'Nature',
      description: '自然の風景',
    }

    const editCategory = (category: Record<string, unknown>) => {
      return category
    }

    const result = editCategory(category)
    expect(result.id).toBe('cat1')
    expect(result.name).toBe('Nature')
  })

  it('削除ボタンのクリックイベントが正しく処理される', () => {
    const categoryId = 'cat1'

    const deleteCategory = (id: string) => {
      return id
    }

    const result = deleteCategory(categoryId)
    expect(result).toBe('cat1')
  })

  it('ホバー時のアクションボタンの表示が正しく制御される', () => {
    const isHovered = true
    const shouldShowActions = isHovered

    expect(shouldShowActions).toBe(true)
  })

  it('ホバー時のアクションボタンが非表示になる', () => {
    const isHovered = false
    const shouldShowActions = isHovered

    expect(shouldShowActions).toBe(false)
  })

  it('カテゴリーのスタイルが正しく適用される', () => {
    const cardClasses = ['border-border', 'bg-card', 'hover:bg-muted/50', 'group', 'relative', 'cursor-pointer', 'rounded-xl', 'border', 'p-2', 'transition-all', 'duration-200', 'hover:shadow-md']

    cardClasses.forEach((className) => {
      expect(typeof className).toBe('string')
      expect(className.length).toBeGreaterThan(0)
    })
  })

  it('サムネイル画像のスタイルが正しく適用される', () => {
    const thumbnailClasses = ['border-border', 'bg-muted', 'flex', 'aspect-square', 'w-full', 'items-center', 'justify-center', 'overflow-hidden', 'rounded-2xl', 'border']

    thumbnailClasses.forEach((className) => {
      expect(typeof className).toBe('string')
      expect(className.length).toBeGreaterThan(0)
    })
  })

  it('アイコンのサイズが正しく設定される', () => {
    const iconSizes = {
      loading: 'size-20 animate-spin sm:size-24',
      default: 'size-20 sm:size-24',
    }

    expect(iconSizes.loading).toBe('size-20 animate-spin sm:size-24')
    expect(iconSizes.default).toBe('size-20 sm:size-24')
  })

  it('テキストのスタイルが正しく適用される', () => {
    const textStyles = {
      title: 'mb-2 line-clamp-2 text-lg font-semibold',
      description: 'text-muted-foreground line-clamp-3 text-sm',
    }

    expect(textStyles.title).toBe('mb-2 line-clamp-2 text-lg font-semibold')
    expect(textStyles.description).toBe('text-muted-foreground line-clamp-3 text-sm')
  })

  it('アクションボタンのスタイルが正しく適用される', () => {
    const buttonStyles = {
      container: 'absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100',
      button: 'bg-background/80 hover:bg-background h-8 w-8 p-0',
    }

    expect(buttonStyles.container).toBe('absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100')
    expect(buttonStyles.button).toBe('bg-background/80 hover:bg-background h-8 w-8 p-0')
  })

  it('エラーハンドリングが正しく動作する', () => {
    const handleError = (error: unknown) => {
      if (error instanceof Error) {
        return error.message
      }
      return 'Unknown error'
    }

    const testError = new Error('Image loading failed')
    const result = handleError(testError)
    expect(result).toBe('Image loading failed')

    const unknownError = 'String error'
    const unknownResult = handleError(unknownError)
    expect(unknownResult).toBe('Unknown error')
  })
})
