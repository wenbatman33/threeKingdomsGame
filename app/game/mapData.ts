/**
 * 地圖靜態資料 — 16 州模型（1 遊戲單位 = 1 州 path 群）
 * 14 主州 + 益州拆北/南、荊州拆北/南 = 16 個遊戲單位
 * 座標為 Han bbox 內 0..1 比例（xPct,yPct），由州 path bbox 中心算出。
 */
import type { CountyDef, FactionMeta, StateMeta } from './types'

export const STATES: StateMeta[] = [
  { id: 'liang',   name: '涼州' },
  { id: 'sili',    name: '司隸' },
  { id: 'yong',    name: '雍州' },
  { id: 'bing',    name: '并州' },
  { id: 'ji',      name: '冀州' },
  { id: 'you',     name: '幽州' },
  { id: 'qing',    name: '青州' },
  { id: 'xu',      name: '徐州' },
  { id: 'yan',     name: '兗州' },
  { id: 'yu',      name: '豫州' },
  { id: 'yang',    name: '揚州' },
  { id: 'jing',    name: '荊州' },
  { id: 'jingnan', name: '荊南' },
  { id: 'yi',      name: '益州' },
  { id: 'yinan',   name: '益州南' },
  { id: 'jiao',    name: '交州' },
]

/**
 * 16 州遊戲單位定義。
 * provinceId 對應 STATE_PATHS 鍵（與 id 相同）。
 * xPct/yPct 為各州 path 群 bbox 中心，相對於整體 Han bbox。
 *
 * 起始勢力（劇本：三家鼎立）：
 *   曹操 → 豫州（許都）
 *   劉備 → 益州（成都）
 *   孫權 → 揚州（建業）
 *   其餘 13 州中立。
 */
const RAW: CountyDef[] = [
  { id: 'liang',   name: '涼州',   stateId: 'liang',   provinceId: 'liang',   xPct: 0.1660, yPct: 0.1545, adjacent: ['yong', 'sili', 'yi'] },
  { id: 'sili',    name: '司隸',   stateId: 'sili',    provinceId: 'sili',    xPct: 0.5241, yPct: 0.3240, adjacent: ['yong', 'bing', 'ji', 'yan', 'yu', 'jing', 'yi'] },
  { id: 'yong',    name: '雍州',   stateId: 'yong',    provinceId: 'yong',    xPct: 0.3537, yPct: 0.3378, adjacent: ['liang', 'sili', 'bing', 'yi'] },
  { id: 'bing',    name: '并州',   stateId: 'bing',    provinceId: 'bing',    xPct: 0.5264, yPct: 0.2266, adjacent: ['yong', 'sili', 'ji', 'you'] },
  { id: 'ji',      name: '冀州',   stateId: 'ji',      provinceId: 'ji',      xPct: 0.6259, yPct: 0.2290, adjacent: ['sili', 'bing', 'you', 'qing', 'yan'] },
  { id: 'you',     name: '幽州',   stateId: 'you',     provinceId: 'you',     xPct: 0.7816, yPct: 0.1248, adjacent: ['bing', 'ji', 'qing'] },
  { id: 'qing',    name: '青州',   stateId: 'qing',    provinceId: 'qing',    xPct: 0.7322, yPct: 0.2756, adjacent: ['ji', 'you', 'xu', 'yan'] },
  { id: 'xu',      name: '徐州',   stateId: 'xu',      provinceId: 'xu',      xPct: 0.7034, yPct: 0.3504, adjacent: ['qing', 'yan', 'yu', 'yang'] },
  { id: 'yan',     name: '兗州',   stateId: 'yan',     provinceId: 'yan',     xPct: 0.6339, yPct: 0.3205, adjacent: ['sili', 'ji', 'qing', 'xu', 'yu'] },
  { id: 'yu',      name: '豫州',   stateId: 'yu',      provinceId: 'yu',      xPct: 0.6130, yPct: 0.4040, adjacent: ['sili', 'yan', 'xu', 'yang', 'jing'], isCapital: true },
  { id: 'yang',    name: '揚州',   stateId: 'yang',    provinceId: 'yang',    xPct: 0.6832, yPct: 0.5754, adjacent: ['xu', 'yu', 'jing', 'jingnan', 'jiao'], isCapital: true },
  { id: 'jing',    name: '荊州',   stateId: 'jing',    provinceId: 'jing',    xPct: 0.4980, yPct: 0.4341, adjacent: ['sili', 'yu', 'yang', 'yi', 'jingnan'] },
  { id: 'jingnan', name: '荊南',   stateId: 'jingnan', provinceId: 'jingnan', xPct: 0.5135, yPct: 0.6104, adjacent: ['jing', 'yang', 'yinan', 'jiao'] },
  { id: 'yi',      name: '益州',   stateId: 'yi',      provinceId: 'yi',      xPct: 0.3312, yPct: 0.4799, adjacent: ['liang', 'sili', 'yong', 'jing', 'yinan'], isCapital: true },
  { id: 'yinan',   name: '益州南', stateId: 'yinan',   provinceId: 'yinan',   xPct: 0.2363, yPct: 0.7007, adjacent: ['yi', 'jingnan', 'jiao'] },
  { id: 'jiao',    name: '交州',   stateId: 'jiao',    provinceId: 'jiao',    xPct: 0.4841, yPct: 0.8365, adjacent: ['yang', 'jingnan', 'yinan'] },
]

/** 使用者在 /editor 中的座標覆寫（從 localStorage 載入；僅影響顯示與點擊命中） */
function applyOverrides(defs: CountyDef[]): CountyDef[] {
  if (typeof window === 'undefined') return defs
  try {
    const raw = window.localStorage.getItem('county-overrides')
    if (!raw) return defs
    const overrides = JSON.parse(raw) as Record<string, { xPct: number; yPct: number }>
    return defs.map((d) => {
      const o = overrides[d.id]
      if (!o) return d
      return { ...d, xPct: o.xPct, yPct: o.yPct }
    })
  } catch {
    return defs
  }
}

/** 把單向 adjacent 正規化為雙向 */
function normalizeAdjacency(defs: CountyDef[]): CountyDef[] {
  const map = new Map(defs.map((d) => [d.id, new Set(d.adjacent)]))
  for (const d of defs) {
    for (const n of d.adjacent) {
      map.get(n)?.add(d.id)
    }
  }
  return defs.map((d) => ({ ...d, adjacent: [...(map.get(d.id) ?? [])] }))
}

export const COUNTIES: CountyDef[] = applyOverrides(normalizeAdjacency(RAW))
export const COUNTY_MAP = new Map(COUNTIES.map((c) => [c.id, c]))

export const FACTIONS: FactionMeta[] = [
  { id: 'cao', name: '曹操軍', lordName: '曹操', color: '#3a5a9a', capitalId: 'yu' },
  { id: 'liu', name: '劉備軍', lordName: '劉備', color: '#4a7c3a', capitalId: 'yi' },
  { id: 'sun', name: '孫權軍', lordName: '孫權', color: '#b73229', capitalId: 'yang' },
]

export const FACTION_MAP = new Map(FACTIONS.map((f) => [f.id, f]))

// ---------- 遊戲常數 ----------
/** 單格容量（普通州） */
export const CAPACITY_NORMAL = 30
/** 單格容量（首都） */
export const CAPACITY_CAPITAL = 50
/** 中立州起始兵力 */
export const NEUTRAL_START = 8
/** 玩家/AI 首都起始兵力 */
export const CAPITAL_START = 22
/** 已占領州 +1 兵的間隔（ms） */
export const GROW_INTERVAL_MS = 1500
/** 派兵波每毫秒進度（1 = 整條線） */
export const WAVE_SPEED_PER_MS = 1 / 1400
/** AI 決策間隔（ms） */
export const AI_INTERVAL_MS = 2500
/** 最少派兵數 */
export const MIN_SEND = 2
/** 交戰每秒互扣兵力（攻守雙方同時 -N） */
export const BATTLE_RATE_PER_SEC = 10
