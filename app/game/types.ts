/**
 * State.io 風三國志 — 型別定義
 */

/** 勢力（玩家/AI）與中立 */
export type OwnerId = 'cao' | 'liu' | 'sun' | 'neutral'
export type FactionId = Exclude<OwnerId, 'neutral'>

/** 州（僅用於分組/顏色，不影響玩法） */
export interface StateMeta {
  id: string
  name: string
}

/** 靜態郡資料（座標為 Han bbox 內的 0..1 比例） */
export interface CountyDef {
  id: string
  name: string
  stateId: string
  /** 對應 STATE_PATHS 中的州代碼（14 州模型：1 遊戲單位 = 1 州 path 群） */
  provinceId: string
  xPct: number
  yPct: number
  /** 相鄰郡 id（雙向） */
  adjacent: string[]
  /** 是否首都（容量翻倍） */
  isCapital?: boolean
}

/** 動態郡狀態 */
export interface CountyState {
  id: string
  ownerId: OwnerId
  troops: number
  capacity: number
  /** 下次 +1 的時間戳（ms） */
  nextGrowAt: number
}

/** 派兵波（視覺 + 邏輯） */
export interface Wave {
  id: number
  fromId: string
  toId: string
  ownerId: FactionId
  troops: number
  /** 0..1，線段上的進度 */
  progress: number
  /** 每毫秒進度增量 */
  speed: number
  /** 階段：行軍中 → 抵達敵方後進入交戰 */
  phase?: 'moving' | 'fighting'
  /** 交戰小數累積（滿 1 扣 1 兵） */
  fightBuffer?: number
}

/** 勢力靜態資料 */
export interface FactionMeta {
  id: FactionId
  name: string
  lordName: string
  color: string
  capitalId: string
}

/** 全域遊戲狀態 */
export interface GameState {
  startedAt: number
  elapsedMs: number
  counties: Record<string, CountyState>
  waves: Wave[]
  nextWaveId: number
  playerFactionId: FactionId
  phase: 'playing' | 'victory' | 'defeat'
  winner: OwnerId | null
  paused: boolean
}
