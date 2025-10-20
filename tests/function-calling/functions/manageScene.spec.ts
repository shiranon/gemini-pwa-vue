import { Type } from '@google/genai'
import { beforeEach, describe, expect, it } from 'bun:test'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { manageScene, manageSceneDeclaration } from '~/function-calling/functions/manageScene'

describe('manageScene', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {},
      timestamp: Date.now(),
    }
  })

  describe('正常系', () => {
    it('初期状態でシーン情報を取得できる', async () => {
      const args: FunctionCallArgs = {
        action: 'get',
      }

      const result = await manageScene(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.currentScene.sceneId).toBe('initial')
      expect(result.currentScene.location).toBe('不明な場所')
      expect(result.message).toBe('現在のシーン情報を取得しました。')
    })

    it('シーン情報を設定できる', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        location: '森の中',
        timeOfDay: 'morning',
        mood: 'calm',
        pov: 'first',
        notes: '鳥のさえずりが聞こえる',
      }

      const result = await manageScene(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.currentScene.location).toBe('森の中')
      expect(result.currentScene.timeOfDay).toBe('morning')
      expect(result.currentScene.mood).toBe('calm')
      expect(result.currentScene.pov).toBe('first')
      expect(result.currentScene.notes).toBe('鳥のさえずりが聞こえる')
      expect(result.message).toContain('森の中')
    })

    it('部分的なシーン情報を設定できる', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        location: '城の中',
      }

      const result = await manageScene(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.currentScene.location).toBe('城の中')
      expect(result.currentScene.sceneId).toBe('initial') // 既存の値は保持される
    })

    it('新しいシーンに移行できる', async () => {
      const args: FunctionCallArgs = {
        action: 'push',
        sceneId: 'forest_scene',
        location: '森の中',
        timeOfDay: 'evening',
        mood: 'mysterious',
      }

      const result = await manageScene(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.currentScene.sceneId).toBe('forest_scene')
      expect(result.currentScene.location).toBe('森の中')
      expect(result.currentScene.timeOfDay).toBe('evening')
      expect(result.currentScene.mood).toBe('mysterious')
      expect(result.message).toContain('新しいシーン「森の中」に移行しました')
    })

    it('前のシーンに戻れる', async () => {
      // 新しいシーンに移行
      await manageScene(
        {
          action: 'push',
          sceneId: 'forest_scene',
          location: '森の中',
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'pop',
      }

      const result = await manageScene(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.currentScene.sceneId).toBe('initial')
      expect(result.currentScene.location).toBe('不明な場所')
      expect(result.message).toContain('シーン「森の中」から「不明な場所」に戻りました')
    })

    it('複数のシーンをスタックできる', async () => {
      // 1つ目のシーンに移行
      await manageScene(
        {
          action: 'push',
          sceneId: 'scene1',
          location: '場所1',
        },
        mockContext
      )

      // 2つ目のシーンに移行
      await manageScene(
        {
          action: 'push',
          sceneId: 'scene2',
          location: '場所2',
        },
        mockContext
      )

      // 3つ目のシーンに移行
      const args: FunctionCallArgs = {
        action: 'push',
        sceneId: 'scene3',
        location: '場所3',
      }

      const result = await manageScene(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.currentScene.sceneId).toBe('scene3')
      expect(result.currentScene.location).toBe('場所3')
    })

    it('複数回popできる', async () => {
      // 複数のシーンをスタック
      await manageScene(
        {
          action: 'push',
          sceneId: 'scene1',
          location: '場所1',
        },
        mockContext
      )

      await manageScene(
        {
          action: 'push',
          sceneId: 'scene2',
          location: '場所2',
        },
        mockContext
      )

      // 1回目のpop
      let result = await manageScene(
        {
          action: 'pop',
        },
        mockContext
      )

      expect(result.success).toBe(true)
      expect(result.currentScene.location).toBe('場所1')

      // 2回目のpop
      result = await manageScene(
        {
          action: 'pop',
        },
        mockContext
      )

      expect(result.success).toBe(true)
      expect(result.currentScene.location).toBe('不明な場所')
    })

    it('有効なtimeOfDayの値を設定できる', async () => {
      const validTimes = ['morning', 'noon', 'evening', 'night']

      for (const timeOfDay of validTimes) {
        const args: FunctionCallArgs = {
          action: 'set',
          timeOfDay,
        }

        const result = await manageScene(args, mockContext)

        expect(result.success).toBe(true)
        expect(result.currentScene.timeOfDay).toBe(timeOfDay)
      }
    })

    it('有効なmoodの値を設定できる', async () => {
      const validMoods = ['sweet', 'calm', 'tense', 'dark', 'mysterious', 'romantic', 'action', 'dramatic']

      for (const mood of validMoods) {
        const args: FunctionCallArgs = {
          action: 'set',
          mood,
        }

        const result = await manageScene(args, mockContext)

        expect(result.success).toBe(true)
        expect(result.currentScene.mood).toBe(mood)
      }
    })

    it('有効なpovの値を設定できる', async () => {
      const validPovs = ['first', 'third']

      for (const pov of validPovs) {
        const args: FunctionCallArgs = {
          action: 'set',
          pov,
        }

        const result = await manageScene(args, mockContext)

        expect(result.success).toBe(true)
        expect(result.currentScene.pov).toBe(pov)
      }
    })
  })

  describe('異常系', () => {
    it('actionが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        location: '森の中',
      }

      const result = await manageScene(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe("引数 'action' は必須です。")
    })

    it('popアクションでこれ以上戻れない場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'pop',
      }

      const result = await manageScene(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('これ以上前のシーンに戻ることはできません。')
    })

    it('無効なアクションを指定した場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'invalid_action',
      }

      const result = await manageScene(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('無効なアクションです: invalid_action')
    })
  })

  describe('永続メモリの管理', () => {
    it('persistentMemoryが未初期化の場合は自動で初期化する', async () => {
      const contextWithoutMemory: FunctionExecutionContext = {
        timestamp: Date.now(),
      }

      const args: FunctionCallArgs = {
        action: 'get',
      }

      const result = await manageScene(args, contextWithoutMemory)

      expect(result.success).toBe(true)
      expect(contextWithoutMemory.persistentMemory).toBeDefined()
      expect(Array.isArray(contextWithoutMemory.persistentMemory!.sceneStack)).toBe(true)
      expect(contextWithoutMemory.persistentMemory!.sceneStack).toHaveLength(1)
    })

    it('sceneStackが未初期化の場合は自動で初期化する', async () => {
      const contextWithPartialMemory: FunctionExecutionContext = {
        persistentMemory: {},
        timestamp: Date.now(),
      }

      const args: FunctionCallArgs = {
        action: 'get',
      }

      const result = await manageScene(args, contextWithPartialMemory)

      expect(result.success).toBe(true)
      expect(Array.isArray(contextWithPartialMemory.persistentMemory!.sceneStack)).toBe(true)
      expect(contextWithPartialMemory.persistentMemory!.sceneStack).toHaveLength(1)
    })

    it('シーンスタックが正しく管理される', async () => {
      // 複数のシーンをスタック
      await manageScene(
        {
          action: 'push',
          sceneId: 'scene1',
          location: '場所1',
        },
        mockContext
      )

      await manageScene(
        {
          action: 'push',
          sceneId: 'scene2',
          location: '場所2',
        },
        mockContext
      )

      // スタックの状態を確認
      expect(mockContext.persistentMemory!.sceneStack).toHaveLength(3) // initial + scene1 + scene2

      // popして確認
      await manageScene(
        {
          action: 'pop',
        },
        mockContext
      )

      expect(mockContext.persistentMemory!.sceneStack).toHaveLength(2) // initial + scene1
    })
  })

  describe('シーン情報の継承', () => {
    it('push時に既存のシーン情報が継承される', async () => {
      // 現在のシーンに情報を設定
      await manageScene(
        {
          action: 'set',
          timeOfDay: 'morning',
          mood: 'calm',
        },
        mockContext
      )

      // 新しいシーンに移行（locationのみ指定）
      const args: FunctionCallArgs = {
        action: 'push',
        location: '新しい場所',
      }

      const result = await manageScene(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.currentScene.location).toBe('新しい場所')
      expect(result.currentScene.timeOfDay).toBe('morning') // 継承される
      expect(result.currentScene.mood).toBe('calm') // 継承される
    })

    it('set時に指定されたプロパティのみが更新される', async () => {
      // 初期状態でシーン情報を設定
      await manageScene(
        {
          action: 'set',
          location: '森の中',
          timeOfDay: 'morning',
          mood: 'calm',
        },
        mockContext
      )

      // 一部のプロパティのみを更新
      const args: FunctionCallArgs = {
        action: 'set',
        mood: 'tense',
        notes: '緊張感が漂う',
      }

      const result = await manageScene(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.currentScene.location).toBe('森の中') // 保持される
      expect(result.currentScene.timeOfDay).toBe('morning') // 保持される
      expect(result.currentScene.mood).toBe('tense') // 更新される
      expect(result.currentScene.notes).toBe('緊張感が漂う') // 新規設定
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(manageSceneDeclaration.name).toBe('manageScene')
      expect(manageSceneDeclaration.description).toContain('シーン')
      expect(manageSceneDeclaration.parameters?.type).toBe(Type.OBJECT)
      expect(manageSceneDeclaration.parameters?.required).toContain('action')
    })
  })
})
