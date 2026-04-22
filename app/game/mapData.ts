/**
 * 地圖靜態資料 — 估算自 china.png (1536×1024)
 * 座標為 0..1 比例，之後可在 /editor 微調。
 */
import type { CountyDef, FactionMeta, StateMeta } from './types'

export const STATES: StateMeta[] = [
  { id: 'liang', name: '涼州' },
  { id: 'yong', name: '雍州' },
  { id: 'bing', name: '并州' },
  { id: 'ji', name: '冀州' },
  { id: 'you', name: '幽州' },
  { id: 'qing', name: '青州' },
  { id: 'xu', name: '徐州' },
  { id: 'yan', name: '兗州' },
  { id: 'yu', name: '豫州' },
  { id: 'yang', name: '揚州' },
  { id: 'jing', name: '荊州' },
  { id: 'yi', name: '益州' },
  { id: 'jiao', name: '交州' },
]

/**
 * 郡定義。adjacent 為單向列，最後會被 normalizeAdjacency 自動補成雙向。
 * 座標為初版估計值；精確位置可在 /editor 頁拖曳調整（存 localStorage 覆寫）。
 */
const RAW: CountyDef[] = [
  // ---- 涼州（3） ----
  { id: 'wuwei',    name: '武威', stateId: 'liang', xPct: 0.14, yPct: 0.18, adjacent: ['jincheng', 'beidi'] },
  { id: 'jincheng', name: '金城', stateId: 'liang', xPct: 0.12, yPct: 0.27, adjacent: ['longxi', 'anding'] },
  { id: 'longxi',   name: '隴西', stateId: 'liang', xPct: 0.14, yPct: 0.35, adjacent: ['anding', 'hanzhong'] },

  // ---- 雍州（3） ----
  { id: 'anding',   name: '安定', stateId: 'yong', xPct: 0.22, yPct: 0.28, adjacent: ['beidi', 'jingzhao'] },
  { id: 'beidi',    name: '北地', stateId: 'yong', xPct: 0.26, yPct: 0.18, adjacent: ['taiyuan'] },
  { id: 'jingzhao', name: '京兆', stateId: 'yong', xPct: 0.30, yPct: 0.35, adjacent: ['shangdang', 'yingchuan', 'hanzhong'] },

  // ---- 并州（3） ----
  { id: 'yanmen',   name: '雁門', stateId: 'bing', xPct: 0.38, yPct: 0.12, adjacent: ['taiyuan'] },
  { id: 'taiyuan',  name: '太原', stateId: 'bing', xPct: 0.40, yPct: 0.22, adjacent: ['shangdang'] },
  { id: 'shangdang',name: '上黨', stateId: 'bing', xPct: 0.46, yPct: 0.28, adjacent: ['zhaoguo', 'weijun', 'dongjun'] },

  // ---- 冀州（3） ----
  { id: 'zhaoguo',  name: '趙國', stateId: 'ji', xPct: 0.55, yPct: 0.18, adjacent: ['weijun', 'bohai', 'zhuojun'] },
  { id: 'weijun',   name: '魏郡', stateId: 'ji', xPct: 0.58, yPct: 0.26, adjacent: ['bohai', 'dongjun'] },
  { id: 'bohai',    name: '渤海', stateId: 'ji', xPct: 0.65, yPct: 0.19, adjacent: ['zhuojun', 'qiguo'] },

  // ---- 幽州（3） ----
  { id: 'zhuojun',   name: '涿郡', stateId: 'you', xPct: 0.66, yPct: 0.10, adjacent: ['yuyang'] },
  { id: 'yuyang',    name: '漁陽', stateId: 'you', xPct: 0.72, yPct: 0.08, adjacent: ['youbeiping'] },
  { id: 'youbeiping',name: '右北平', stateId: 'you', xPct: 0.78, yPct: 0.09, adjacent: ['donglai'] },

  // ---- 青州（3） ----
  { id: 'qiguo',   name: '齊國', stateId: 'qing', xPct: 0.76, yPct: 0.28, adjacent: ['beihai', 'langya'] },
  { id: 'beihai',  name: '北海', stateId: 'qing', xPct: 0.82, yPct: 0.25, adjacent: ['donglai', 'langya'] },
  { id: 'donglai', name: '東萊', stateId: 'qing', xPct: 0.87, yPct: 0.28, adjacent: [] },

  // ---- 兗州（3） ----
  { id: 'chenliu', name: '陳留', stateId: 'yan', xPct: 0.56, yPct: 0.36, adjacent: ['dongjun', 'jiyin', 'yingchuan', 'peiguo'] },
  { id: 'dongjun', name: '東郡', stateId: 'yan', xPct: 0.60, yPct: 0.32, adjacent: ['jiyin'] },
  { id: 'jiyin',   name: '濟陰', stateId: 'yan', xPct: 0.63, yPct: 0.36, adjacent: ['pengcheng', 'peiguo'] },

  // ---- 徐州（3） ----
  { id: 'pengcheng',name: '彭城', stateId: 'xu', xPct: 0.72, yPct: 0.42, adjacent: ['xiapi', 'langya', 'peiguo'] },
  { id: 'langya',  name: '琅琊',  stateId: 'xu', xPct: 0.78, yPct: 0.38, adjacent: ['xiapi'] },
  { id: 'xiapi',   name: '下邳',  stateId: 'xu', xPct: 0.76, yPct: 0.46, adjacent: ['peiguo'] },

  // ---- 豫州（3） ----
  { id: 'yingchuan',name: '潁川', stateId: 'yu', xPct: 0.52, yPct: 0.44, adjacent: ['runan', 'nanyang'], isCapital: true },
  { id: 'runan',    name: '汝南', stateId: 'yu', xPct: 0.58, yPct: 0.50, adjacent: ['peiguo', 'nanyang', 'jiujiang'] },
  { id: 'peiguo',   name: '沛國', stateId: 'yu', xPct: 0.64, yPct: 0.44, adjacent: ['xiapi'] },

  // ---- 荊州（4） ----
  { id: 'nanyang', name: '南陽',  stateId: 'jing', xPct: 0.48, yPct: 0.54, adjacent: ['nanjun', 'hanzhong'] },
  { id: 'nanjun',  name: '南郡',  stateId: 'jing', xPct: 0.46, yPct: 0.64, adjacent: ['jiangxia', 'changsha', 'bajun'] },
  { id: 'jiangxia',name: '江夏',  stateId: 'jing', xPct: 0.54, yPct: 0.66, adjacent: ['changsha', 'lujiang', 'jiujiang'] },
  { id: 'changsha',name: '長沙',  stateId: 'jing', xPct: 0.50, yPct: 0.76, adjacent: ['cangwu'] },

  // ---- 益州（3） ----
  { id: 'hanzhong',name: '漢中',  stateId: 'yi', xPct: 0.28, yPct: 0.52, adjacent: ['shujun', 'bajun'] },
  { id: 'shujun',  name: '蜀郡',  stateId: 'yi', xPct: 0.18, yPct: 0.66, adjacent: ['bajun'], isCapital: true },
  { id: 'bajun',   name: '巴郡',  stateId: 'yi', xPct: 0.26, yPct: 0.68, adjacent: [] },

  // ---- 揚州（4） ----
  { id: 'jiujiang',name: '九江',  stateId: 'yang', xPct: 0.66, yPct: 0.54, adjacent: ['lujiang', 'peiguo'] },
  { id: 'lujiang', name: '廬江',  stateId: 'yang', xPct: 0.70, yPct: 0.60, adjacent: ['danyang'] },
  { id: 'danyang', name: '丹陽',  stateId: 'yang', xPct: 0.76, yPct: 0.62, adjacent: ['wujun'] },
  { id: 'wujun',   name: '吳郡',  stateId: 'yang', xPct: 0.84, yPct: 0.62, adjacent: [], isCapital: true },

  // ---- 交州（2） ----
  { id: 'cangwu',  name: '蒼梧',  stateId: 'jiao', xPct: 0.52, yPct: 0.84, adjacent: ['nanhai'] },
  { id: 'nanhai',  name: '南海',  stateId: 'jiao', xPct: 0.60, yPct: 0.86, adjacent: [] },
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
  { id: 'cao', name: '曹操軍', lordName: '曹操', color: '#3a5a9a', capitalId: 'yingchuan' },
  { id: 'liu', name: '劉備軍', lordName: '劉備', color: '#4a7c3a', capitalId: 'shujun' },
  { id: 'sun', name: '孫權軍', lordName: '孫權', color: '#b73229', capitalId: 'wujun' },
]

export const FACTION_MAP = new Map(FACTIONS.map((f) => [f.id, f]))

// ---------- 遊戲常數 ----------
/** 單格容量（普通郡） */
export const CAPACITY_NORMAL = 30
/** 單格容量（首都） */
export const CAPACITY_CAPITAL = 50
/** 中立郡起始兵力 */
export const NEUTRAL_START = 8
/** 玩家/AI 首都起始兵力 */
export const CAPITAL_START = 22
/** 已占領郡 +1 兵的間隔（ms） */
export const GROW_INTERVAL_MS = 1500
/** 派兵波每毫秒進度（1 = 整條線） */
export const WAVE_SPEED_PER_MS = 1 / 1400
/** AI 決策間隔（ms） */
export const AI_INTERVAL_MS = 2500
/** 最少派兵數 */
export const MIN_SEND = 2
