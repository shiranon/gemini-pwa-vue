import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { FolderStructure } from '~/composables/useFolderUpload'
import type { CharacterImageRecord, CharacterOutfitRecord, CharacterRecord } from '../../app/types/database'

// ============================================================================
// 既存ロジックテスト用のモックデータ
// ============================================================================

const mockCharacter: CharacterRecord = {
  id: 'char-1',
  name: 'テストキャラクター',
  description: 'テスト用のキャラクター',
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

const mockOutfit: CharacterOutfitRecord = {
  id: 'outfit-1',
  characterId: 'char-1',
  name: 'テスト衣装',
  description: 'テスト用の衣装',
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

const mockImage: CharacterImageRecord = {
  id: 'image-1',
  characterId: 'char-1',
  outfitId: 'outfit-1',
  expression: '笑顔',
  mimeType: 'image/jpeg',
  base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  size: 1000,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

// ============================================================================
// imageBulkUpload.ts の純粋関数テスト
// ============================================================================

describe('imageBulkUpload', () => {
  describe('getFileNameWithoutExtension', () => {
    let getFileNameWithoutExtension: (filename: string) => string

    beforeEach(async () => {
      const mod = await import('~/lib/imageBulkUpload')
      getFileNameWithoutExtension = mod.getFileNameWithoutExtension
    })

    it('拡張子を除いたファイル名を返す', () => {
      expect(getFileNameWithoutExtension('smile.png')).toBe('smile')
    })

    it('複数のドットがある場合は最後のドット以降を除く', () => {
      expect(getFileNameWithoutExtension('my.image.file.jpg')).toBe('my.image.file')
    })

    it('拡張子がない場合はファイル名をそのまま返す', () => {
      expect(getFileNameWithoutExtension('noextension')).toBe('noextension')
    })

    it('先頭がドットの隠しファイルはそのまま返す', () => {
      expect(getFileNameWithoutExtension('.gitignore')).toBe('.gitignore')
    })

    it('空文字列を処理する', () => {
      expect(getFileNameWithoutExtension('')).toBe('')
    })
  })

  describe('createBulkImageUploader', () => {
    let createBulkImageUploader: typeof import('~/lib/imageBulkUpload').createBulkImageUploader

    beforeEach(async () => {
      const mod = await import('~/lib/imageBulkUpload')
      createBulkImageUploader = mod.createBulkImageUploader
    })

    const createMockImageUpload = (
      overrides: {
        uploadResult?: { base64Data: string; mimeType: string; size: number } | null
        errorValue?: string | null
      } = {}
    ) =>
      ({
        uploadImage: mock(async () =>
          'uploadResult' in overrides
            ? overrides.uploadResult
            : {
                base64Data: 'data:image/png;base64,AAAA',
                mimeType: 'image/png',
                size: 1024,
              }
        ),
        error: { value: overrides.errorValue ?? null },
        clearError: mock(),
        isUploading: { value: false },
        progress: { value: 0 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any

    const createMockFile = (name: string): File => {
      return new File(['dummy'], name, { type: 'image/png' })
    }

    it('全ファイルのアップロードに成功する', async () => {
      const mockUpload = createMockImageUpload()
      const dbUploadFn = mock(async () => ({ success: true }))

      const uploader = createBulkImageUploader(mockUpload, dbUploadFn, 'test')
      const files = [createMockFile('smile.png'), createMockFile('angry.png')]

      const result = await uploader(files)

      expect(result.success).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(dbUploadFn).toHaveBeenCalledTimes(2)
    })

    it('進捗コールバックが正しく呼ばれる', async () => {
      const mockUpload = createMockImageUpload()
      const dbUploadFn = mock(async () => ({ success: true }))
      const onProgress = mock()

      const uploader = createBulkImageUploader(mockUpload, dbUploadFn, 'test')
      const files = [createMockFile('a.png'), createMockFile('b.png'), createMockFile('c.png')]

      await uploader(files, onProgress)

      expect(onProgress).toHaveBeenCalledTimes(3)
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3)
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3)
      expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3)
    })

    it('画像処理失敗時にfailedカウントが増える', async () => {
      const mockUpload = createMockImageUpload({
        uploadResult: null,
        errorValue: '画像が大きすぎます',
      })
      const dbUploadFn = mock(async () => ({ success: true }))

      const uploader = createBulkImageUploader(mockUpload, dbUploadFn, 'test')
      const files = [createMockFile('bad.png')]

      const result = await uploader(files)

      expect(result.success).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('bad')
      expect(dbUploadFn).not.toHaveBeenCalled()
    })

    it('DBアップロード失敗時にfailedカウントが増える', async () => {
      const mockUpload = createMockImageUpload()
      const dbUploadFn = mock(async () => ({ success: false, error: 'DB error' }))

      const uploader = createBulkImageUploader(mockUpload, dbUploadFn, 'test')
      const files = [createMockFile('test.png')]

      const result = await uploader(files)

      expect(result.success).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.errors[0]).toContain('DB error')
    })

    it('base64データ抽出失敗時にfailedカウントが増える', async () => {
      const mockUpload = createMockImageUpload({
        uploadResult: {
          base64Data: 'invalid-no-comma',
          mimeType: 'image/png',
          size: 1024,
        },
      })
      const dbUploadFn = mock(async () => ({ success: true }))

      const uploader = createBulkImageUploader(mockUpload, dbUploadFn, 'test')
      const files = [createMockFile('broken.png')]

      const result = await uploader(files)

      expect(result.success).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.errors[0]).toContain('画像データの抽出に失敗')
    })

    it('空のファイル配列では成功0失敗0を返す', async () => {
      const mockUpload = createMockImageUpload()
      const dbUploadFn = mock(async () => ({ success: true }))

      const uploader = createBulkImageUploader(mockUpload, dbUploadFn, 'test')
      const result = await uploader([])

      expect(result.success).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('一部成功・一部失敗の混在を正しくカウントする', async () => {
      let callCount = 0
      const mockUpload = createMockImageUpload()
      const dbUploadFn = mock(async () => {
        callCount++
        if (callCount === 2) {
          return { success: false, error: 'second file failed' }
        }
        return { success: true }
      })

      const uploader = createBulkImageUploader(mockUpload, dbUploadFn, 'test')
      const files = [createMockFile('a.png'), createMockFile('b.png'), createMockFile('c.png')]

      const result = await uploader(files)

      expect(result.success).toBe(2)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('createBulkOutfitUploader', () => {
    let createBulkOutfitUploader: typeof import('~/lib/imageBulkUpload').createBulkOutfitUploader

    beforeEach(async () => {
      const mod = await import('~/lib/imageBulkUpload')
      createBulkOutfitUploader = mod.createBulkOutfitUploader
    })

    const createMockFile = (name: string): File => {
      return new File(['dummy'], name, { type: 'image/png' })
    }

    it('複数衣装と画像を正しくアップロードする', async () => {
      const createOutfit = mock(async (_charId: string, outfitName: string) => ({
        id: `outfit-${outfitName}`,
      }))
      const uploadImages = mock(async () => ({
        success: 2,
        failed: 0,
        errors: [],
      }))

      const uploader = createBulkOutfitUploader(createOutfit, uploadImages, 'test')
      const outfits = [
        { outfitName: 'casual', images: [createMockFile('a.png'), createMockFile('b.png')] },
        { outfitName: 'formal', images: [createMockFile('c.png'), createMockFile('d.png')] },
      ]

      const result = await uploader('char-1', outfits)

      expect(result.success).toBe(4)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(createOutfit).toHaveBeenCalledTimes(2)
      expect(uploadImages).toHaveBeenCalledTimes(2)
    })

    it('衣装作成失敗時にその衣装の画像数がfailedに加算される', async () => {
      const createOutfit = mock(async () => null)
      const uploadImages = mock(async () => ({
        success: 0,
        failed: 0,
        errors: [],
      }))

      const uploader = createBulkOutfitUploader(createOutfit, uploadImages, 'test')
      const outfits = [{ outfitName: 'broken', images: [createMockFile('a.png'), createMockFile('b.png'), createMockFile('c.png')] }]

      const result = await uploader('char-1', outfits)

      expect(result.success).toBe(0)
      expect(result.failed).toBe(3)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('broken')
      expect(uploadImages).not.toHaveBeenCalled()
    })

    it('進捗コールバックがオフセット付きで正しく呼ばれる', async () => {
      const createOutfit = mock(async (_charId: string, outfitName: string) => ({
        id: `outfit-${outfitName}`,
      }))

      const uploadImages = mock(async (_charId: string, _outfitId: string, files: File[], onProgress?: (current: number, total: number) => void) => {
        for (let i = 0; i < files.length; i++) {
          onProgress?.(i + 1, files.length)
        }
        return { success: files.length, failed: 0, errors: [] }
      })

      const onProgress = mock()
      const uploader = createBulkOutfitUploader(createOutfit, uploadImages, 'test')

      const outfits = [
        { outfitName: 'outfit1', images: [createMockFile('a.png'), createMockFile('b.png')] },
        { outfitName: 'outfit2', images: [createMockFile('c.png')] },
      ]

      await uploader('char-1', outfits, onProgress)

      // outfit1: offset=0, images=2 -> onProgress(1,3), onProgress(2,3)
      // outfit2: offset=2, images=1 -> onProgress(3,3)
      expect(onProgress).toHaveBeenCalledTimes(3)
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3)
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3)
      expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3)
    })

    it('空の衣装配列では成功0失敗0を返す', async () => {
      const createOutfit = mock(async () => ({ id: 'outfit-id' }))
      const uploadImages = mock(async () => ({ success: 0, failed: 0, errors: [] }))

      const uploader = createBulkOutfitUploader(createOutfit, uploadImages, 'test')
      const result = await uploader('char-1', [])

      expect(result.success).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(createOutfit).not.toHaveBeenCalled()
    })

    it('衣装処理中の例外がキャッチされてエラーに含まれる', async () => {
      const createOutfit = mock(async () => {
        throw new Error('unexpected outfit error')
      })
      const uploadImages = mock(async () => ({ success: 0, failed: 0, errors: [] }))

      const uploader = createBulkOutfitUploader(createOutfit, uploadImages, 'test')
      const outfits = [{ outfitName: 'error-outfit', images: [createMockFile('a.png')] }]

      const result = await uploader('char-1', outfits)

      expect(result.success).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('error-outfit')
      expect(result.errors[0]).toContain('unexpected outfit error')
    })
  })
})

// ============================================================================
// useCharacterImages composable の bulkUploadMultipleCharacters テスト
// ============================================================================

const mockDbCreateCharacter = mock(async (name: string, _desc?: string) => ({
  success: true,
  data: {
    id: `char-${name}`,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as CharacterRecord,
}))

const mockDbCreateCharacterOutfit = mock(async (characterId: string, name: string) => ({
  success: true,
  data: {
    id: `outfit-${name}`,
    characterId,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
}))

const mockDbUploadCharacterImage = mock(async () => ({
  success: true,
  data: {
    id: 'img-1',
    characterId: 'char-1',
    outfitId: 'outfit-1',
    expression: 'smile',
    base64Data: 'AAAA',
    mimeType: 'image/png',
    size: 1024,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
}))

mock.module('~/lib/database', () => ({
  dbCreateCharacter: mockDbCreateCharacter,
  dbCreateCharacterOutfit: mockDbCreateCharacterOutfit,
  dbUploadCharacterImage: mockDbUploadCharacterImage,
  dbDeleteCharacter: mock(async () => ({ success: true })),
  dbDeleteCharacterImage: mock(async () => ({ success: true })),
  dbDeleteCharacterOutfit: mock(async () => ({ success: true })),
  dbGetAllCharacters: mock(async () => ({ success: true, data: [] })),
  dbGetCharacterAllImages: mock(async () => ({ success: true, data: [] })),
  dbGetCharacterFirstImage: mock(async () => ({ success: true, data: null })),
  dbGetCharacterImageByNames: mock(async () => ({ success: true, data: null })),
  dbGetCharacterOutfits: mock(async () => ({ success: true, data: [] })),
  dbGetOutfitImages: mock(async () => ({ success: true, data: [] })),
  dbUpdateCharacter: mock(async () => ({ success: true })),
  dbUpdateCharacterOutfit: mock(async () => ({ success: true })),
}))

mock.module('~/lib/logger', () => ({
  logger: {
    info: mock(),
    warn: mock(),
    error: mock(),
    debug: mock(),
  },
}))

mock.module('~/stores/settings', () => ({
  useSettingsStore: () => ({
    settings: {
      enableImageOptimization: false,
      maxImageWidth: 1920,
      maxImageHeight: 1080,
      compressionQuality: 0.8,
      enableWebPConversion: false,
      webpQuality: 0.8,
    },
  }),
}))

mock.module('~/composables/useImageUpload', () => ({
  useImageUpload: () => ({
    uploadImage: mock(async () => ({
      base64Data: 'data:image/png;base64,AAAA',
      mimeType: 'image/png',
      size: 1024,
    })),
    error: { value: null },
    clearError: mock(),
    isUploading: { value: false },
    progress: { value: 0 },
  }),
  processFileOrAttachedFile: mock(async () => ({
    base64: 'AAAA',
    mimeType: 'image/png',
    size: 1024,
  })),
}))

mock.module('~/composables/useFolderUpload', () => ({
  useFolderUpload: () => ({
    isSupported: { value: true },
    selectFolder: mock(async () => null),
    selectMultipleFolders: mock(async () => []),
  }),
}))

describe('useCharacterImages - bulkUploadMultipleCharacters', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let useCharacterImages: any

  beforeEach(async () => {
    mockDbCreateCharacter.mockClear()
    mockDbCreateCharacterOutfit.mockClear()
    mockDbUploadCharacterImage.mockClear()

    // デフォルトの成功モック実装を再設定
    mockDbCreateCharacter.mockImplementation(async (name: string) => ({
      success: true,
      data: {
        id: `char-${name}`,
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as CharacterRecord,
    }))

    const mod = await import('~/composables/useCharacterImages')
    useCharacterImages = mod.useCharacterImages
  })

  const createMockFile = (name: string): File => {
    return new File(['dummy'], name, { type: 'image/png' })
  }

  const createFolderStructure = (charName: string, outfits: { name: string; imageNames: string[] }[]): FolderStructure => ({
    characterName: charName,
    outfits: outfits.map((o) => ({
      outfitName: o.name,
      images: o.imageNames.map((img) => createMockFile(img)),
    })),
  })

  it('複数キャラクターの一括アップロードが成功する', async () => {
    const composable = useCharacterImages()

    const structures: FolderStructure[] = [
      createFolderStructure('Alice', [{ name: 'casual', imageNames: ['smile.png', 'angry.png'] }]),
      createFolderStructure('Bob', [{ name: 'formal', imageNames: ['happy.png'] }]),
    ]

    const result = await composable.bulkUploadMultipleCharacters(structures)

    expect(result.characters).toHaveLength(2)
    expect(result.characters[0].name).toBe('Alice')
    expect(result.characters[1].name).toBe('Bob')
    expect(result.totalSuccess).toBe(3)
    expect(result.totalFailed).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('進捗コールバックが正しいオフセットで呼ばれる', async () => {
    const composable = useCharacterImages()
    const onProgress = mock()

    const structures: FolderStructure[] = [
      createFolderStructure('Alice', [{ name: 'casual', imageNames: ['a.png', 'b.png'] }]),
      createFolderStructure('Bob', [{ name: 'formal', imageNames: ['c.png'] }]),
    ]

    await composable.bulkUploadMultipleCharacters(structures, onProgress)

    // onProgressが呼ばれていることを確認
    expect(onProgress.mock.calls.length).toBeGreaterThan(0)

    // grandTotal は 3 (2 + 1) なので、全ての呼び出しでtotalが3であることを確認
    for (const call of onProgress.mock.calls) {
      expect(call[1]).toBe(3)
    }

    // 最後の呼び出しでcurrentがgrandTotalに到達
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1]
    expect(lastCall?.[0]).toBe(3)
  })

  it('部分エラー時の動作（一部キャラクターのアップロード失敗）', async () => {
    // 2番目のキャラクター作成で失敗するようモックを設定
    let createCallCount = 0
    mockDbCreateCharacter.mockImplementation(async (name: string, _desc?: string) => {
      createCallCount++
      if (createCallCount === 2) {
        return { success: false, data: undefined as unknown as CharacterRecord, error: 'キャラクター作成失敗' }
      }
      return {
        success: true,
        data: {
          id: `char-${name}`,
          name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as CharacterRecord,
      }
    })

    const composable = useCharacterImages()

    const structures: FolderStructure[] = [
      createFolderStructure('Alice', [{ name: 'casual', imageNames: ['smile.png'] }]),
      createFolderStructure('Bob', [{ name: 'formal', imageNames: ['happy.png', 'sad.png'] }]),
    ]

    const result = await composable.bulkUploadMultipleCharacters(structures)

    // Alice は成功、Bob はキャラクター作成失敗
    expect(result.characters).toHaveLength(1)
    expect(result.characters[0].name).toBe('Alice')
    expect(result.totalSuccess).toBe(1)
    // Bob のキャラクター作成失敗 -> bulkUploadFromFolder がエラーを返す
    expect(result.totalFailed).toBeGreaterThanOrEqual(2)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('空の入力では空の結果を返す', async () => {
    const composable = useCharacterImages()

    const result = await composable.bulkUploadMultipleCharacters([])

    expect(result.characters).toHaveLength(0)
    expect(result.totalSuccess).toBe(0)
    expect(result.totalFailed).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('空の衣装を持つキャラクターを処理できる', async () => {
    const composable = useCharacterImages()

    const structures: FolderStructure[] = [createFolderStructure('EmptyChar', [])]

    const result = await composable.bulkUploadMultipleCharacters(structures)

    expect(result.characters).toHaveLength(1)
    expect(result.characters[0].name).toBe('EmptyChar')
    expect(result.totalSuccess).toBe(0)
    expect(result.totalFailed).toBe(0)
  })
})

// ============================================================================
// 既存のロジックテスト（キャラクター画像管理）
// ============================================================================

describe('useCharacterImages（ロジックテスト）', () => {
  describe('状態管理のロジック', () => {
    it('初期状態が正しく設定される', () => {
      const isLoading = false
      const error = null
      const characters = [] as CharacterRecord[]
      const outfits = [] as CharacterOutfitRecord[]
      const images = [] as CharacterImageRecord[]

      expect(isLoading).toBe(false)
      expect(error).toBeNull()
      expect(characters).toHaveLength(0)
      expect(outfits).toHaveLength(0)
      expect(images).toHaveLength(0)
    })

    it('ローディング状態が正しく管理される', () => {
      const isLoading = true
      const hasError = false
      const hasData = false

      expect(isLoading).toBe(true)
      expect(hasError).toBe(false)
      expect(hasData).toBe(false)
    })

    it('エラー状態が正しく管理される', () => {
      const isLoading = false
      const error = new Error('エラーが発生しました')
      const hasError = !!error

      expect(isLoading).toBe(false)
      expect(hasError).toBe(true)
      expect(error.message).toBe('エラーが発生しました')
    })

    it('データ取得成功状態が正しく管理される', () => {
      const isLoading = false
      const error = null
      const characters = [mockCharacter]

      expect(isLoading).toBe(false)
      expect(error).toBeNull()
      expect(characters).toHaveLength(1)
    })
  })

  describe('キャラクター管理のロジック', () => {
    it('キャラクターの作成が正しく処理される', () => {
      const name = '新しいキャラクター'
      const description = '説明'
      const character = {
        id: 'generated-id',
        name,
        description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      expect(character.name).toBe(name)
      expect(character.description).toBe(description)
      expect(character.id).toBeDefined()
      expect(character.createdAt).toBeDefined()
      expect(character.updatedAt).toBeDefined()
    })

    it('キャラクター名の重複チェックが正しく動作する', () => {
      const existingCharacters = [mockCharacter]
      const newCharacterName = 'テストキャラクター'
      const isDuplicate = existingCharacters.some((char) => char.name === newCharacterName)

      expect(isDuplicate).toBe(true)
    })

    it('キャラクターの取得が正しく動作する', () => {
      const characters = [mockCharacter]
      const characterId = 'char-1'
      const character = characters.find((char) => char.id === characterId)

      expect(character).toBeDefined()
      expect(character?.id).toBe(characterId)
    })

    it('キャラクターの削除が正しく処理される', () => {
      const characters = [mockCharacter]
      const characterId = 'char-1'
      const filteredCharacters = characters.filter((char) => char.id !== characterId)

      expect(filteredCharacters).toHaveLength(0)
    })
  })

  describe('衣装管理のロジック', () => {
    it('衣装の作成が正しく処理される', () => {
      const characterId = 'char-1'
      const name = '新しい衣装'
      const description = '説明'
      const outfit = {
        id: 'generated-id',
        characterId,
        name,
        description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      expect(outfit.characterId).toBe(characterId)
      expect(outfit.name).toBe(name)
      expect(outfit.description).toBe(description)
      expect(outfit.id).toBeDefined()
      expect(outfit.createdAt).toBeDefined()
      expect(outfit.updatedAt).toBeDefined()
    })

    it('キャラクターに紐づく衣装の取得が正しく動作する', () => {
      const outfits = [mockOutfit]
      const characterId = 'char-1'
      const characterOutfits = outfits.filter((outfit) => outfit.characterId === characterId)

      expect(characterOutfits).toHaveLength(1)
      expect(characterOutfits[0]?.characterId).toBe(characterId)
    })

    it('衣装の削除が正しく処理される', () => {
      const outfits = [mockOutfit]
      const outfitId = 'outfit-1'
      const filteredOutfits = outfits.filter((outfit) => outfit.id !== outfitId)

      expect(filteredOutfits).toHaveLength(0)
    })
  })

  describe('画像管理のロジック', () => {
    it('画像のアップロードが正しく処理される', () => {
      const characterId = 'char-1'
      const outfitId = 'outfit-1'
      const expression = '笑顔'
      const mimeType = 'image/jpeg'
      const base64Data = 'base64data'
      const size = 1000

      const image = {
        id: 'generated-id',
        characterId,
        outfitId,
        expression,
        mimeType,
        base64Data,
        size,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      expect(image.characterId).toBe(characterId)
      expect(image.outfitId).toBe(outfitId)
      expect(image.expression).toBe(expression)
      expect(image.mimeType).toBe(mimeType)
      expect(image.base64Data).toBe(base64Data)
      expect(image.size).toBe(size)
      expect(image.id).toBeDefined()
      expect(image.createdAt).toBeDefined()
      expect(image.updatedAt).toBeDefined()
    })

    it('衣装に紐づく画像の取得が正しく動作する', () => {
      const images = [mockImage]
      const outfitId = 'outfit-1'
      const outfitImages = images.filter((image) => image.outfitId === outfitId)

      expect(outfitImages).toHaveLength(1)
      expect(outfitImages[0]?.outfitId).toBe(outfitId)
    })

    it('画像の削除が正しく処理される', () => {
      const images = [mockImage]
      const imageId = 'image-1'
      const filteredImages = images.filter((image) => image.id !== imageId)

      expect(filteredImages).toHaveLength(0)
    })

    it('画像の重複チェックが正しく動作する', () => {
      const existingImages = [mockImage]
      const characterId = 'char-1'
      const outfitId = 'outfit-1'
      const expression = '笑顔'
      const isDuplicate = existingImages.some((image) => image.characterId === characterId && image.outfitId === outfitId && image.expression === expression)

      expect(isDuplicate).toBe(true)
    })
  })

  describe('ファイル処理のロジック', () => {
    it('ファイルの検証が正しく動作する', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      const isValidType = validTypes.includes(file.type)
      const maxSize = 5 * 1024 * 1024 // 5MB
      const isValidSize = file.size <= maxSize

      expect(isValidType).toBe(true)
      expect(isValidSize).toBe(true)
    })

    it('無効なファイル形式の検証が正しく動作する', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      const isValidType = validTypes.includes(file.type)

      expect(isValidType).toBe(false)
    })

    it('ファイルサイズの検証が正しく動作する', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }) // 10MB
      const maxSize = 5 * 1024 * 1024 // 5MB
      const isValidSize = file.size <= maxSize

      expect(isValidSize).toBe(false)
    })

    it('Base64変換の処理が正しく動作する', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockBase64 = 'dGVzdA==' // 'test'のBase64
      const mimeType = file.type
      const dataUrl = `data:${mimeType};base64,${mockBase64}`

      expect(dataUrl).toBe('data:image/jpeg;base64,dGVzdA==')
    })
  })

  describe('データの検索とフィルタリング', () => {
    it('キャラクター名での検索が正しく動作する', () => {
      const characters = [mockCharacter]
      const searchTerm = 'テスト'
      const filteredCharacters = characters.filter((char) => char.name.includes(searchTerm))

      expect(filteredCharacters).toHaveLength(1)
      expect(filteredCharacters[0]?.name).toContain(searchTerm)
    })

    it('衣装名での検索が正しく動作する', () => {
      const outfits = [mockOutfit]
      const searchTerm = 'テスト'
      const filteredOutfits = outfits.filter((outfit) => outfit.name.includes(searchTerm))

      expect(filteredOutfits).toHaveLength(1)
      expect(filteredOutfits[0]?.name).toContain(searchTerm)
    })

    it('表情での検索が正しく動作する', () => {
      const images = [mockImage]
      const searchTerm = '笑顔'
      const filteredImages = images.filter((image) => image.expression.includes(searchTerm))

      expect(filteredImages).toHaveLength(1)
      expect(filteredImages[0]?.expression).toContain(searchTerm)
    })
  })

  describe('データの並び替え', () => {
    it('キャラクターの作成日時での並び替えが正しく動作する', () => {
      const characters = [
        { ...mockCharacter, id: 'char-1', createdAt: 1000 },
        { ...mockCharacter, id: 'char-2', createdAt: 2000 },
      ]

      const sortedCharacters = characters.sort((a, b) => b.createdAt - a.createdAt)

      expect(sortedCharacters[0]?.id).toBe('char-2')
      expect(sortedCharacters[1]?.id).toBe('char-1')
    })

    it('画像の更新日時での並び替えが正しく動作する', () => {
      const images = [
        { ...mockImage, id: 'image-1', updatedAt: 1000 },
        { ...mockImage, id: 'image-2', updatedAt: 2000 },
      ]

      const sortedImages = images.sort((a, b) => b.updatedAt - a.updatedAt)

      expect(sortedImages[0]?.id).toBe('image-2')
      expect(sortedImages[1]?.id).toBe('image-1')
    })
  })

  describe('エラーハンドリング', () => {
    it('必須フィールドの検証が正しく動作する', () => {
      const characterData = { name: '', description: '説明' }
      const hasRequiredFields = !!(characterData.name && characterData.description)

      expect(hasRequiredFields).toBe(false)
    })

    it('空のデータの処理が正しく動作する', () => {
      const emptyArray: CharacterRecord[] = []
      const hasData = emptyArray.length > 0

      expect(hasData).toBe(false)
    })

    it('無効なIDの処理が正しく動作する', () => {
      const invalidId = ''
      const isValidId = !!invalidId

      expect(isValidId).toBe(false)
    })

    it('データベースエラーの処理が正しく動作する', () => {
      const error = new Error('データベースエラーが発生しました')
      const hasError = !!error
      const errorMessage = error.message

      expect(hasError).toBe(true)
      expect(errorMessage).toBe('データベースエラーが発生しました')
    })
  })

  describe('データの整合性チェック', () => {
    it('キャラクターと衣装の関連性が正しく検証される', () => {
      const character = mockCharacter
      const outfit = mockOutfit
      const isValidRelation = outfit.characterId === character.id

      expect(isValidRelation).toBe(true)
    })

    it('衣装と画像の関連性が正しく検証される', () => {
      const outfit = mockOutfit
      const image = mockImage
      const isValidRelation = image.outfitId === outfit.id && image.characterId === outfit.characterId

      expect(isValidRelation).toBe(true)
    })

    it('存在しないキャラクターの衣装は無効', () => {
      const outfit = mockOutfit
      const existingCharacters = [] as CharacterRecord[]
      const isValidOutfit = existingCharacters.some((char) => char.id === outfit.characterId)

      expect(isValidOutfit).toBe(false)
    })

    it('存在しない衣装の画像は無効', () => {
      const image = mockImage
      const existingOutfits = [] as CharacterOutfitRecord[]
      const isValidImage = existingOutfits.some((outfit) => outfit.id === image.outfitId)

      expect(isValidImage).toBe(false)
    })
  })

  describe('パフォーマンス最適化', () => {
    it('データのキャッシュが正しく動作する', () => {
      const cache = new Map<string, CharacterRecord[]>()
      const key = 'characters'
      const data = [mockCharacter]

      cache.set(key, data)
      const cachedData = cache.get(key)

      expect(cachedData).toEqual(data)
    })

    it('重複データの排除が正しく動作する', () => {
      const duplicateCharacters = [mockCharacter, mockCharacter]
      const uniqueCharacters = Array.from(new Set(duplicateCharacters.map((char) => char.id)))
        .map((id) => duplicateCharacters.find((char) => char.id === id))
        .filter(Boolean)

      expect(uniqueCharacters).toHaveLength(1)
    })
  })
})
