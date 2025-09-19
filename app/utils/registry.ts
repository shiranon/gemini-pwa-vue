import type { FunctionToolDefinition } from '~/types/function-calling'

import { getCurrentDateTime, getCurrentDateTimeDeclaration } from './functions/datetime'
import { manageCharacterStatus, manageCharacterStatusDeclaration } from './functions/manageCharacterStatus'
import { manageInventory, manageInventoryDeclaration } from './functions/manageInventory'
import { rollDice, rollDiceDeclaration } from './functions/rollDice'
import { manageTimer, manageTimerDeclaration } from './functions/timer'

/**
 * Function Callingで利用可能なツール定義一覧
 */
export const functionToolDefinitions: FunctionToolDefinition[] = [
  {
    declaration: getCurrentDateTimeDeclaration,
    handler: getCurrentDateTime,
    meta: {
      id: 'getCurrentDateTime',
      displayName: '現在時刻を取得',
      description: 'JSTの現在日時と曜日、タイムゾーンを返します。',
      category: 'datetime',
      tags: ['time', 'date', 'jst'],
      defaultEnabled: true,
      argsHint: '引数は不要です。',
    },
  },
  {
    declaration: manageCharacterStatusDeclaration,
    handler: manageCharacterStatus,
    meta: {
      id: 'manageCharacterStatus',
      displayName: 'ステータス管理',
      description: 'キャラクターのHP/MPなどのステータスを設定・増減・取得します。',
      category: 'game',
      tags: ['status', 'character'],
      defaultEnabled: false,
      argsHint: 'characterName, action, statusKey, value(optional)',
      contextHint: 'persistentMemory.character_<name> にステータスを保存します。',
    },
  },
  {
    declaration: manageInventoryDeclaration,
    handler: manageInventory,
    meta: {
      id: 'manageInventory',
      displayName: 'インベントリ管理',
      description: 'キャラクターの所持品を追加・削除・確認します。',
      category: 'game',
      tags: ['inventory', 'items'],
      defaultEnabled: false,
      argsHint: 'character_name, action, item_name, quantity(optional)',
      contextHint: 'persistentMemory.inventories 内に所持品を記録します。',
    },
  },
  {
    declaration: rollDiceDeclaration,
    handler: rollDice,
    meta: {
      id: 'rollDice',
      displayName: 'ダイスロール',
      description: '指定したダイス式で乱数を生成し結果を返します。',
      category: 'game',
      tags: ['dice', 'random'],
      defaultEnabled: true,
      argsHint: 'expression（例: 1d6, 2d10+5）',
    },
  },
  {
    declaration: manageTimerDeclaration,
    handler: manageTimer,
    meta: {
      id: 'manageTimer',
      displayName: 'タイマー管理',
      description: 'タイマーの開始・確認・停止を行います。',
      category: 'utility',
      tags: ['timer', 'time-management'],
      defaultEnabled: false,
      argsHint: 'action, timer_name, duration_minutes(optional)',
      contextHint: 'アプリ内のメモリ(Map)でタイマーを保持します。',
    },
  },
]
