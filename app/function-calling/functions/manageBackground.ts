/**
 * 背景画像管理のFunction Calling実装
 * クライアント側から渡された背景画像リストを使用し、AIが適切な背景を選択できるようにする
 */

import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'
import { logger } from '~/lib/logger'

/**
 * シンプルな画像情報の型定義
 */
interface SimpleImageInfo {
  name: string
  categoryName: string
}

/**
 * 背景画像選択結果の型定義（categoryName/imageName形式）
 */
interface BackgroundSelectionResult {
  categoryName: string
  imageName: string
  selectionResult: string // "categoryName/imageName"形式の文字列
}

interface BackgroundManagementResult {
  success: boolean
  message: string
  data?: {
    selectionResult?: BackgroundSelectionResult
  }
  error?: string
}

/**
 * 背景画像を管理する関数
 *
 * クライアント側から渡された背景画像リストの中から、
 * AIが物語のシーンや雰囲気に応じて適切な背景画像を選択します。
 *
 * @param args - Function Callingの引数
 * @param context - Function Callingの実行コンテキスト
 * @returns 背景画像管理の結果
 */
export async function manageBackground(args: FunctionCallArgs, context: FunctionExecutionContext): Promise<BackgroundManagementResult> {
  logger.info(`[Function Calling] manageBackgroundが呼び出されました。コンテキスト:`, { component: 'manageBackground' }, context)

  try {
    const { scene, categoryName, imageName } = args as {
      scene: string
      categoryName: string
      imageName: string
    }

    // 必須パラメータのチェック
    if (!scene) {
      return {
        success: false,
        message: '',
        error: 'シーンの説明を指定してください（例: 朝の駅、夕暮れの森、雨の街など）',
      }
    }

    if (!categoryName || !imageName) {
      return {
        success: false,
        message: '',
        error: 'categoryNameとimageNameの両方を指定してください',
      }
    }

    // 選択結果を「categoryName/imageName」形式で出力
    const selectionResult: BackgroundSelectionResult = {
      categoryName,
      imageName,
      selectionResult: `${categoryName}/${imageName}`,
    }

    // 選択結果のみを返し、画像データはクライアント側で取得する
    // これによりFunction Calling結果が肥大化してトークン数が爆発するのを防ぐ
    logger.info(`[Function Calling] 背景画像選択結果を返します:`, {
      component: 'manageBackground',
      scene,
      selectionResult: selectionResult.selectionResult,
    })

    return {
      success: true,
      message: `シーン「${scene}」に適した背景画像「${selectionResult.selectionResult}」を選択しました。一時的に背景を切り替えます。`,
      data: {
        selectionResult,
      },
    }
  } catch (error) {
    logger.error(`[Function Calling] manageBackgroundでエラーが発生しました:`, { component: 'manageBackground' }, error)
    return {
      success: false,
      message: `内部エラーが発生しました: ${(error as Error).message}`,
      error: `内部エラーが発生しました: ${(error as Error).message}`,
    }
  }
}

/**
 * manageBackground関数のGemini AI Function Calling宣言を動的に生成
 * DBから背景画像リストを取得してdescriptionに含める
 */
export async function createManageBackgroundDeclaration(): Promise<FunctionDeclaration> {
  try {
    // 循環参照を回避するため動的インポート
    const { dbGetAllBackgroundImages, dbGetAllBackgroundCategories } = await import('~/lib/database')

    // 背景画像リストを取得
    const allImagesResult = await dbGetAllBackgroundImages()
    const categoriesResult = await dbGetAllBackgroundCategories()

    if (!allImagesResult.success || !allImagesResult.data || !categoriesResult.success || !categoriesResult.data) {
      // エラー時は空リストとして返す
      return createFallbackDeclaration([])
    }

    // カテゴリーマップを作成
    const categoryMap = new Map(categoriesResult.data.map((cat) => [cat.id, cat.name]))

    // 背景画像リストをシンプルな形式に変換
    const availableImages = allImagesResult.data.map((img) => ({
      name: img.name,
      categoryName: categoryMap.get(img.categoryId) || '不明',
    }))

    return createFallbackDeclaration(availableImages)
  } catch (error) {
    logger.error('[Function Calling] 背景画像リストの取得に失敗しました:', { component: 'manageBackground' }, error)
    return createFallbackDeclaration([])
  }
}

/**
 * Function Declarationを生成する内部関数
 */
function createFallbackDeclaration(availableImages: SimpleImageInfo[]): FunctionDeclaration {
  // 利用可能な背景リストを文字列化
  const imageListStr = availableImages.length > 0 ? availableImages.map((img) => `"${img.categoryName}/${img.name}"`).join(', ') : '現在利用可能な背景画像はありません'

  return {
    name: 'manageBackground',
    description: `シーンの説明に基づいて、利用可能な背景画像から最も適切な背景を選択します。

利用可能な背景画像一覧（categoryName/imageName形式）:
${imageListStr}

上記のリストから、シーンに最も適した背景のcategoryNameとimageNameを選択してください。`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        scene: {
          type: Type.STRING,
          description: 'シーンの説明（例: 朝の駅、夕暮れの森、雨の街など）',
        },
        categoryName: {
          type: Type.STRING,
          description: '選択する背景画像のカテゴリー名',
        },
        imageName: {
          type: Type.STRING,
          description: '選択する背景画像の名前',
        },
      },
      required: ['scene', 'categoryName', 'imageName'],
    },
  }
}
