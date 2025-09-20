import type { FunctionToolDefinition } from '~/types/function-calling'

import { getCurrentDateTime, getCurrentDateTimeDeclaration } from './functions/datetime'
import { generateRandomString, generateRandomStringDeclaration } from './functions/generateRandomString'
import { getRandomChoice, getRandomChoiceDeclaration } from './functions/getRandomChoice'
import { getRandomInteger, getRandomIntegerDeclaration } from './functions/getRandomInteger'
import { manageCharacterStatus, manageCharacterStatusDeclaration } from './functions/manageCharacterStatus'
import { manageFlags, manageFlagsDeclaration } from './functions/manageFlags'
import { manageGameDate, manageGameDateDeclaration } from './functions/manageGameDate'
import { manageInventory, manageInventoryDeclaration } from './functions/manageInventory'
import { managePersistentMemory, managePersistentMemoryDeclaration } from './functions/managePersistentMemory'
import { manageRelationship, manageRelationshipDeclaration } from './functions/manageRelationship'
import { manageScene, manageSceneDeclaration } from './functions/manageScene'
import { manageStyleProfile, manageStyleProfileDeclaration } from './functions/manageStyleProfile'
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
      argsHint: 'action, timerName, durationMinutes(optional) - start / check / stop',
      contextHint: 'アプリ内のメモリ(Map)でタイマーを保持します。',
    },
  },
  {
    declaration: managePersistentMemoryDeclaration,
    handler: managePersistentMemory,
    meta: {
      id: 'managePersistentMemory',
      displayName: '永続メモリ管理',
      description: 'チャットセッションの永続メモリを管理します。',
      category: 'utility',
      tags: ['memory', 'persistent', 'storage'],
      defaultEnabled: false,
      argsHint: 'action, key(optional), value(optional) - add/get/delete/list',
      contextHint: 'persistentMemory にキーと値のペアを保存します。',
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
      argsHint: 'characterName, action, statusKey, value(optional) - set / increase / decrease / get',
      contextHint: 'persistentMemory.character<Name> にステータスを保存します。',
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
      argsHint: 'characterName, action, itemName, quantity(optional) - add / remove / check',
      contextHint: 'persistentMemory.inventories 内に所持品を記録します。',
    },
  },
  {
    declaration: manageSceneDeclaration,
    handler: manageScene,
    meta: {
      id: 'manageScene',
      displayName: 'シーン管理',
      description: '物語のシーン（場所、時間、雰囲気など）を管理します。',
      category: 'story',
      tags: ['scene', 'location', 'mood', 'story'],
      defaultEnabled: false,
      argsHint: 'action, location, timeOfDay, mood, pov, notes(optional) - get/set/push/pop',
      contextHint: 'persistentMemory.sceneStack にシーン履歴を保存します。',
    },
  },
  {
    declaration: manageFlagsDeclaration,
    handler: manageFlags,
    meta: {
      id: 'manageFlags',
      displayName: 'フラグ管理',
      description: '物語のフラグやカウンターを管理します。フラグの設定・取得・切り替え、カウンターの増減、削除が可能です。',
      category: 'story',
      tags: ['flags', 'counters', 'story', 'state'],
      defaultEnabled: false,
      argsHint: 'action, key, value(optional), ttlMinutes(optional) - set / get / toggle / increase / decrease / delete',
      contextHint: 'persistentMemory にフラグとカウンターを保存します。',
    },
  },
  {
    declaration: manageGameDateDeclaration,
    handler: manageGameDate,
    meta: {
      id: 'manageGameDate',
      displayName: 'ゲーム日数管理',
      description: 'ゲーム内の経過日数を管理します。日数の経過、現在の日数取得が可能です。',
      category: 'game',
      tags: ['date', 'time', 'game-progress'],
      defaultEnabled: false,
      argsHint: 'action, days(optional) - passDays / getCurrentDay',
      contextHint: 'persistentMemory.gameDay にゲーム日数を保存します。',
    },
  },
  {
    declaration: getRandomIntegerDeclaration,
    handler: getRandomInteger,
    meta: {
      id: 'getRandomInteger',
      displayName: 'ランダム整数生成',
      description: '指定された範囲内のランダムな整数を生成します。最小値、最大値、生成個数を指定できます。',
      category: 'utility',
      tags: ['random', 'number', 'generator'],
      defaultEnabled: false,
      argsHint: 'min, max, count(optional) - 範囲内のランダム整数を生成',
      contextHint: 'ゲームやシミュレーションで使用される乱数生成機能です。',
    },
  },
  {
    declaration: getRandomChoiceDeclaration,
    handler: getRandomChoice,
    meta: {
      id: 'getRandomChoice',
      displayName: 'ランダム選択',
      description: '提供されたリストの中からランダムに項目を選択します。選択する個数も指定可能で、重複を許可して選択します。',
      category: 'utility',
      tags: ['random', 'choice', 'selection'],
      defaultEnabled: false,
      argsHint: 'choiceList, choiceCount(optional) - 配列からランダムに項目を選択',
      contextHint: '選択肢の配列からランダムに項目を選ぶ機能です。ゲームや意思決定支援で使用されます。',
    },
  },
  {
    declaration: generateRandomStringDeclaration,
    handler: generateRandomString,
    meta: {
      id: 'generateRandomString',
      displayName: 'ランダム文字列生成',
      description: '指定された条件でランダムな文字列を生成します。文字の種類（大文字、小文字、数字、記号）、長さ、生成個数を指定できます。',
      category: 'utility',
      tags: ['random', 'string', 'generator', 'password'],
      defaultEnabled: false,
      argsHint: 'stringLength, stringCount(optional), useUppercase(optional), useLowercase(optional), useNumbers(optional), useSymbols(optional) - ランダム文字列を生成',
      contextHint: 'パスワードやトークンなどのランダム文字列を生成する機能です。文字の種類や長さを指定できます。',
    },
  },
  {
    declaration: manageRelationshipDeclaration,
    handler: manageRelationship,
    meta: {
      id: 'manageRelationship',
      displayName: '関係値管理',
      description: 'キャラクター間の関係値（好感度、信頼度など）を多軸で管理します。関係値の設定、増減、取得、減衰機能を提供します。',
      category: 'game',
      tags: ['relationship', 'character', 'affection', 'trust'],
      defaultEnabled: false,
      argsHint:
        'sourceCharacter, action, targetCharacter(optional), axis(optional), value(optional), clampMin(optional), clampMax(optional), daysToDecay(optional), decayValue(optional) - set / increase / decrease / get / getAllAxes / getAllFromSource',
      contextHint: 'persistentMemory.relationships にキャラクター間の関係値を保存します。',
    },
  },
  {
    declaration: manageStyleProfileDeclaration,
    handler: manageStyleProfile,
    meta: {
      id: 'manageStyleProfile',
      displayName: 'スタイルプロファイル管理',
      description: 'キャラクターの口調や一人称などのスタイルプロファイルを管理します。定義済みプリセットの適用、カスタム設定の上書き、プロファイルの取得、利用可能なプリセット一覧の表示が可能です。',
      category: 'character',
      tags: ['style', 'character', 'speech', 'personality'],
      defaultEnabled: false,
      argsHint:
        'action, characterName(optional), profileName(optional), overrides(optional) - set / get / list (profileName: polite / casual / tsundere / merchant/ nobleMale / nobleFemale / samurai / ninja / kansai / neutralNarration)',
      contextHint: 'persistentMemory.styleProfiles にキャラクターの口調プロファイルを保存します。',
    },
  },
]
