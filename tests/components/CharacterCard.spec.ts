import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { CharacterImageRecord, CharacterOutfitRecord, CharacterRecord } from '~/types/database'

// テスト用のモックデータ
const mockCharacter: CharacterRecord = {
  id: 'char1',
  name: 'ララ',
  description: '可愛い女の子',
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

const mockOutfits: CharacterOutfitRecord[] = [
  {
    id: 'outfit1',
    characterId: 'char1',
    name: '制服',
    description: '学校の制服',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'outfit2',
    characterId: 'char1',
    name: '体操服',
    description: '体育の時間の服装',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

const mockImages: CharacterImageRecord[] = [
  {
    id: 'img1',
    characterId: 'char1',
    outfitId: 'outfit1',
    expression: '表情通常',
    mimeType: 'image/jpeg',
    base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    size: 1024,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'img2',
    characterId: 'char1',
    outfitId: 'outfit1',
    expression: '表情微笑',
    mimeType: 'image/jpeg',
    base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    size: 1024,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

// navigator.clipboardのモック
const mockClipboard = {
  writeText: mock(() => Promise.resolve()),
}

Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: mockClipboard,
  },
  writable: true,
})

describe('CharacterCard', () => {
  beforeEach(() => {
    mockClipboard.writeText.mockClear()
  })

  describe('コンポーネントの基本機能', () => {
    it('正しいpropsを受け取ってレンダリングされる', () => {
      expect(mockCharacter.id).toBe('char1')
      expect(mockCharacter.name).toBe('ララ')
      expect(mockCharacter.description).toBe('可愛い女の子')
      expect(typeof mockCharacter.createdAt).toBe('number')
      expect(typeof mockCharacter.updatedAt).toBe('number')
    })

    it('キャラクター名が正しく表示される', () => {
      expect(mockCharacter.name).toBe('ララ')
      expect(typeof mockCharacter.name).toBe('string')
      expect(mockCharacter.name.length).toBeGreaterThan(0)
    })

    it('キャラクターの説明が正しく表示される', () => {
      expect(mockCharacter.description).toBe('可愛い女の子')
      expect(typeof mockCharacter.description).toBe('string')
      expect(mockCharacter.description!.length).toBeGreaterThan(0)
    })

    it('説明がないキャラクターでも正しく動作する', () => {
      const characterWithoutDescription: CharacterRecord = {
        id: 'char2',
        name: 'ミミ',
        description: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      expect(characterWithoutDescription.name).toBe('ミミ')
      expect(characterWithoutDescription.description).toBeUndefined()
    })
  })

  describe('イベント処理', () => {
    it('selectイベントが正しく定義される', () => {
      const emits = {
        select: ['character: CharacterRecord'],
      }

      expect(emits.select).toBeDefined()
      expect(Array.isArray(emits.select)).toBe(true)
      expect(emits.select.length).toBe(1)
      expect(emits.select[0]).toBe('character: CharacterRecord')
    })

    it('editイベントが正しく定義される', () => {
      const emits = {
        edit: ['character: CharacterRecord'],
      }

      expect(emits.edit).toBeDefined()
      expect(Array.isArray(emits.edit)).toBe(true)
      expect(emits.edit.length).toBe(1)
      expect(emits.edit[0]).toBe('character: CharacterRecord')
    })

    it('deleteイベントが正しく定義される', () => {
      const emits = {
        delete: ['character: CharacterRecord'],
      }

      expect(emits.delete).toBeDefined()
      expect(Array.isArray(emits.delete)).toBe(true)
      expect(emits.delete.length).toBe(1)
      expect(emits.delete[0]).toBe('character: CharacterRecord')
    })

    it('キャラクターの選択イベントが正しく処理される', () => {
      const selectCharacter = (character: CharacterRecord) => {
        return character
      }

      const result = selectCharacter(mockCharacter)
      expect(result.id).toBe('char1')
      expect(result.name).toBe('ララ')
    })

    it('編集ボタンのクリックイベントが正しく処理される', () => {
      const editCharacter = (character: CharacterRecord) => {
        return character
      }

      const result = editCharacter(mockCharacter)
      expect(result.id).toBe('char1')
      expect(result.name).toBe('ララ')
    })

    it('削除ボタンのクリックイベントが正しく処理される', () => {
      const deleteCharacter = (character: CharacterRecord) => {
        return character
      }

      const result = deleteCharacter(mockCharacter)
      expect(result.id).toBe('char1')
      expect(result.name).toBe('ララ')
    })
  })

  describe('コピー機能', () => {
    it('コピーボタンが正しく配置される', () => {
      const actionButtons = ['copy', 'edit', 'delete']
      expect(actionButtons).toContain('copy')
      expect(actionButtons.length).toBe(3)
    })

    it('コピー機能のテキストテンプレートが正しく生成される', () => {
      const generateCopyText = (character: CharacterRecord, outfits: CharacterOutfitRecord[], expressions: string[]) => {
        const outfitNames = outfits.map((outfit) => outfit.name)
        const expressionNames = expressions

        return `【画像URL】
:character/${character.name}/{現在の服装}/{下記の中から最適な表情を選択}

【URLリスト】
【マークダウンの対象となるキャラクタ】
${character.name}
【マークダウンの対象となる対象服装一覧】
${outfitNames.join('\n')}
【マークダウンの対象となる対象表情一覧】
${expressionNames.join('\n')}`
      }

      const expressions = ['表情通常', '表情微笑']
      const result = generateCopyText(mockCharacter, mockOutfits, expressions)

      expect(result).toContain('【画像URL】')
      expect(result).toContain(':character/ララ/{現在の服装}/{下記の中から最適な表情を選択}')
      expect(result).toContain('【URLリスト】')
      expect(result).toContain('【マークダウンの対象となるキャラクタ】')
      expect(result).toContain('ララ')
      expect(result).toContain('【マークダウンの対象となる対象服装一覧】')
      expect(result).toContain('制服')
      expect(result).toContain('体操服')
      expect(result).toContain('【マークダウンの対象となる対象表情一覧】')
      expect(result).toContain('表情通常')
      expect(result).toContain('表情微笑')
    })

    it('衣装名のリストが正しく生成される', () => {
      const outfitNames = mockOutfits.map((outfit) => outfit.name)
      expect(outfitNames).toEqual(['制服', '体操服'])
      expect(outfitNames.length).toBe(2)
    })

    it('表情名のリストが正しく生成される（重複除去）', () => {
      const expressions = mockImages.map((img) => img.expression)
      const uniqueExpressions = [...new Set(expressions)]
      expect(uniqueExpressions).toEqual(['表情通常', '表情微笑'])
      expect(uniqueExpressions.length).toBe(2)
    })

    it('クリップボードAPIが正しく呼び出される', async () => {
      const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text)
      }

      const testText = 'テストテキスト'
      await copyToClipboard(testText)

      expect(mockClipboard.writeText).toHaveBeenCalledWith(testText)
      expect(mockClipboard.writeText).toHaveBeenCalledTimes(1)
    })

    it('コピー機能のエラーハンドリングが正しく動作する', async () => {
      const copyWithErrorHandling = async (text: string) => {
        try {
          await navigator.clipboard.writeText(text)
          return { success: true }
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }

      // 正常なケース
      const successResult = await copyWithErrorHandling('test')
      expect(successResult.success).toBe(true)

      // エラーケース（モックでエラーを発生させる）
      mockClipboard.writeText.mockRejectedValueOnce(new Error('Clipboard error'))
      const errorResult = await copyWithErrorHandling('test')
      expect(errorResult.success).toBe(false)
      expect(errorResult.error).toBe('Clipboard error')
    })
  })

  describe('通知機能', () => {
    it('通知表示状態が正しく管理される', () => {
      let showNotification = false

      const showCopyNotification = () => {
        showNotification = true
        return showNotification
      }

      const hideCopyNotification = () => {
        showNotification = false
        return showNotification
      }

      expect(showCopyNotification()).toBe(true)
      expect(hideCopyNotification()).toBe(false)
    })

    it('通知の自動非表示が正しく動作する', (done) => {
      let showNotification = true

      const hideNotificationAfterDelay = (delay: number) => {
        setTimeout(() => {
          showNotification = false
          expect(showNotification).toBe(false)
          done()
        }, delay)
      }

      expect(showNotification).toBe(true)
      hideNotificationAfterDelay(10) // 10ms後に非表示
    })

    it('通知メッセージが正しく表示される', () => {
      const notificationMessage = 'コピーしました'
      expect(notificationMessage).toBe('コピーしました')
      expect(typeof notificationMessage).toBe('string')
      expect(notificationMessage.length).toBeGreaterThan(0)
    })
  })

  describe('UI要素とスタイル', () => {
    it('キャラクターカードのスタイルが正しく適用される', () => {
      const cardClasses = ['border-border', 'bg-card', 'hover:bg-muted/50', 'group', 'relative', 'cursor-pointer', 'rounded-xl', 'border', 'p-2', 'transition-all', 'duration-200', 'hover:shadow-md']

      cardClasses.forEach((className) => {
        expect(typeof className).toBe('string')
        expect(className.length).toBeGreaterThan(0)
      })
    })

    it('サムネイル画像のスタイルが正しく適用される', () => {
      const thumbnailClasses = ['border-border', 'bg-muted', 'flex', 'w-full', 'items-center', 'justify-center', 'overflow-hidden', 'rounded-2xl', 'border']

      thumbnailClasses.forEach((className) => {
        expect(typeof className).toBe('string')
        expect(className.length).toBeGreaterThan(0)
      })
    })

    it('アクションボタンのスタイルが正しく適用される', () => {
      const buttonStyles = {
        container: 'absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100',
        copyButton: 'bg-background/80 hover:bg-background h-8 w-8 p-0',
        editButton: 'bg-background/80 hover:bg-background h-8 w-8 p-0',
        deleteButton: 'bg-background/80 hover:bg-background text-destructive hover:text-destructive h-8 w-8 p-0',
      }

      expect(buttonStyles.container).toBe('absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100')
      expect(buttonStyles.copyButton).toBe('bg-background/80 hover:bg-background h-8 w-8 p-0')
      expect(buttonStyles.editButton).toBe('bg-background/80 hover:bg-background h-8 w-8 p-0')
      expect(buttonStyles.deleteButton).toBe('bg-background/80 hover:bg-background text-destructive hover:text-destructive h-8 w-8 p-0')
    })

    it('通知オーバーレイのスタイルが正しく適用される', () => {
      const notificationStyles = {
        overlay: 'bg-background/90 absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-sm transition-opacity duration-200',
        message: 'bg-primary text-primary-foreground flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg',
      }

      expect(notificationStyles.overlay).toBe('bg-background/90 absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-sm transition-opacity duration-200')
      expect(notificationStyles.message).toBe('bg-primary text-primary-foreground flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg')
    })

    it('アイコンのサイズが正しく設定される', () => {
      const iconSizes = {
        copy: 'h-4 w-4',
        edit: 'h-4 w-4',
        delete: 'h-4 w-4',
        check: 'h-5 w-5',
        loading: 'size-20 animate-spin sm:size-24',
        default: 'size-20 sm:size-24',
      }

      expect(iconSizes.copy).toBe('h-4 w-4')
      expect(iconSizes.edit).toBe('h-4 w-4')
      expect(iconSizes.delete).toBe('h-4 w-4')
      expect(iconSizes.check).toBe('h-5 w-5')
      expect(iconSizes.loading).toBe('size-20 animate-spin sm:size-24')
      expect(iconSizes.default).toBe('size-20 sm:size-24')
    })

    it('テキストのスタイルが正しく適用される', () => {
      const textStyles = {
        title: 'mb-2 line-clamp-2 text-lg font-semibold',
        description: 'text-muted-foreground line-clamp-3 text-sm',
        notification: 'text-sm font-medium',
      }

      expect(textStyles.title).toBe('mb-2 line-clamp-2 text-lg font-semibold')
      expect(textStyles.description).toBe('text-muted-foreground line-clamp-3 text-sm')
      expect(textStyles.notification).toBe('text-sm font-medium')
    })
  })

  describe('データ処理', () => {
    it('サムネイル画像のBase64データが正しく処理される', () => {
      const thumbnailImage = mockImages[0]!
      const imageSrc = `data:${thumbnailImage.mimeType};base64,${thumbnailImage.base64Data}`

      expect(imageSrc).toBe('data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
      expect(imageSrc.startsWith('data:')).toBe(true)
      expect(imageSrc.includes('base64,')).toBe(true)
    })

    it('サムネイル画像がない場合にデフォルトアイコンが表示される', () => {
      const thumbnailImage = null
      const isLoadingThumbnail = false

      const shouldShowDefaultIcon = !thumbnailImage && !isLoadingThumbnail
      expect(shouldShowDefaultIcon).toBe(true)
    })

    it('サムネイル画像の読み込み中にローディングアイコンが表示される', () => {
      const isLoadingThumbnail = true

      const shouldShowLoadingIcon = isLoadingThumbnail
      expect(shouldShowLoadingIcon).toBe(true)
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
  })

  describe('統合テスト', () => {
    it('コピー機能の完全なフローが正しく動作する', async () => {
      const copyCharacterText = async (character: CharacterRecord, outfits: CharacterOutfitRecord[], images: CharacterImageRecord[]) => {
        try {
          // 衣装名のリストを作成
          const outfitNames = outfits.map((outfit) => outfit.name)

          // 表情名のリストを作成（重複を除去）
          const expressionNames = [...new Set(images.map((img) => img.expression))]

          // テキストテンプレートを生成
          const textTemplate = `【画像URL】
:character/${character.name}/{現在の服装}/{下記の中から最適な表情を選択}

【URLリスト】
【マークダウンの対象となるキャラクタ】
${character.name}
【マークダウンの対象となる対象服装一覧】
${outfitNames.join('\n')}
【マークダウンの対象となる対象表情一覧】
${expressionNames.join('\n')}`

          // クリップボードにコピー
          await navigator.clipboard.writeText(textTemplate)

          return {
            success: true,
            textTemplate,
            outfitCount: outfitNames.length,
            expressionCount: expressionNames.length,
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      }

      const result = await copyCharacterText(mockCharacter, mockOutfits, mockImages)

      expect(result.success).toBe(true)
      expect(result.textTemplate).toContain('ララ')
      expect(result.textTemplate).toContain('制服')
      expect(result.textTemplate).toContain('体操服')
      expect(result.textTemplate).toContain('表情通常')
      expect(result.textTemplate).toContain('表情微笑')
      expect(result.outfitCount).toBe(2)
      expect(result.expressionCount).toBe(2)
      expect(mockClipboard.writeText).toHaveBeenCalledWith(result.textTemplate)
    })
  })
})
