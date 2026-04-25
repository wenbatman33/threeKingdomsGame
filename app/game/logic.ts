/**
 * State.io 風遊戲邏輯（純函式）
 */
import {
  AI_INTERVAL_MS,
  BATTLE_RATE_PER_SEC,
  CAPACITY_CAPITAL,
  CAPACITY_NORMAL,
  CAPITAL_START,
  COUNTIES,
  COUNTY_MAP,
  FACTIONS,
  GROW_INTERVAL_MS,
  MIN_SEND,
  NEUTRAL_START,
  WAVE_SPEED_PER_MS,
} from './mapData'
import type { CountyState, FactionId, GameState, OwnerId, Wave } from './types'

/** 建立初始狀態 */
export function createInitialState(playerFactionId: FactionId): GameState {
  const counties: Record<string, CountyState> = {}
  for (const c of COUNTIES) {
    const cap = c.isCapital ? CAPACITY_CAPITAL : CAPACITY_NORMAL
    // 首都分配給對應勢力
    const faction = FACTIONS.find((f) => f.capitalId === c.id)
    counties[c.id] = {
      id: c.id,
      ownerId: faction ? faction.id : 'neutral',
      troops: faction ? CAPITAL_START : NEUTRAL_START,
      capacity: cap,
      nextGrowAt: faction ? GROW_INTERVAL_MS : Number.POSITIVE_INFINITY,
    }
  }
  return {
    startedAt: 0,
    elapsedMs: 0,
    counties,
    waves: [],
    nextWaveId: 1,
    playerFactionId,
    phase: 'playing',
    winner: null,
    paused: false,
  }
}

/** 成長：已占領郡每 GROW_INTERVAL_MS 加 1 troop（無上限，可大量囤兵） */
export function applyGrowth(state: GameState): void {
  const t = state.elapsedMs
  for (const c of Object.values(state.counties)) {
    if (c.ownerId === 'neutral') continue
    while (c.nextGrowAt <= t) {
      c.troops += 1
      c.nextGrowAt += GROW_INTERVAL_MS
    }
  }
}

/** 玩家/AI 派兵：派 half（向下取整）從 from 到 to；to 必須相鄰 */
export function sendHalf(
  state: GameState,
  fromId: string,
  toId: string,
  ownerId: FactionId,
): boolean {
  const from = state.counties[fromId]
  const to = state.counties[toId]
  if (!from || !to) return false
  if (from.ownerId !== ownerId) return false
  const fromDef = COUNTY_MAP.get(fromId)
  if (!fromDef || !fromDef.adjacent.includes(toId)) return false
  const amt = Math.floor(from.troops / 2)
  if (amt < MIN_SEND) return false
  from.troops -= amt
  const wave: Wave = {
    id: state.nextWaveId++,
    fromId,
    toId,
    ownerId,
    troops: amt,
    progress: 0,
    speed: WAVE_SPEED_PER_MS,
  }
  wave.phase = 'moving'
  state.waves.push(wave)
  return true
}

/** 推進 waves；抵達自家郡 → 即時增援；抵達敵/中立郡 → 進入 fighting */
export function advanceWaves(state: GameState, dt: number): void {
  const reinforced: number[] = [] // 已完成增援要移除的 wave id
  for (const w of state.waves) {
    if (w.phase === 'fighting') continue // fighting 的 wave 停在目標，不再前進
    w.progress += w.speed * dt
    if (w.progress >= 1) {
      w.progress = 1
      const to = state.counties[w.toId]
      if (!to) {
        reinforced.push(w.id)
        continue
      }
      if (to.ownerId === w.ownerId) {
        // 自家 → 即時增援（無上限）
        to.troops = to.troops + w.troops
        reinforced.push(w.id)
      } else {
        // 敵 / 中立 → 停在邊緣，進入交戰
        w.phase = 'fighting'
        w.fightBuffer = 0
      }
    }
  }
  if (reinforced.length > 0) {
    const s = new Set(reinforced)
    state.waves = state.waves.filter((w) => !s.has(w.id))
  }
  processBattles(state, dt)
}

/** 交戰：fighting 的 wave 與目標郡守軍互相 -1 兵，直到一邊歸 0 */
function processBattles(state: GameState, dt: number): void {
  const RATE_PER_MS = BATTLE_RATE_PER_SEC / 1000
  const toRemove: number[] = []
  for (const w of state.waves) {
    if (w.phase !== 'fighting') continue
    const to = state.counties[w.toId]
    if (!to) {
      toRemove.push(w.id)
      continue
    }
    // 交戰途中若目標變自家（例如別的 wave 先占了）→ 併入
    if (to.ownerId === w.ownerId) {
      to.troops = to.troops + w.troops
      toRemove.push(w.id)
      continue
    }
    w.fightBuffer = (w.fightBuffer ?? 0) + dt * RATE_PER_MS
    while (w.fightBuffer >= 1 && w.troops > 0 && to.troops > 0) {
      w.fightBuffer -= 1
      w.troops -= 1
      to.troops -= 1
    }
    if (to.troops <= 0 && w.troops > 0) {
      // 占領：剩餘攻方兵力進駐（無上限）
      to.ownerId = w.ownerId
      to.troops = w.troops
      to.nextGrowAt = state.elapsedMs + GROW_INTERVAL_MS
      toRemove.push(w.id)
    } else if (w.troops <= 0) {
      // 攻方潰敗
      toRemove.push(w.id)
    }
  }
  if (toRemove.length > 0) {
    const s = new Set(toRemove)
    state.waves = state.waves.filter((w) => !s.has(w.id))
  }
}

/** 檢查勝負：若某勢力 0 郡 → 消滅；僅剩 1 勢力 → 勝 */
export function checkVictory(state: GameState): void {
  const alive: FactionId[] = []
  for (const f of FACTIONS) {
    const has = Object.values(state.counties).some((c) => c.ownerId === f.id)
    if (has) alive.push(f.id)
  }
  if (alive.length <= 1) {
    if (alive.length === 1) {
      state.winner = alive[0]!
      state.phase = alive[0] === state.playerFactionId ? 'victory' : 'defeat'
    } else {
      state.phase = 'defeat'
      state.winner = null
    }
  }
  // 玩家被消滅
  if (!alive.includes(state.playerFactionId)) {
    state.phase = 'defeat'
    state.winner = alive[0] ?? null
  }
}

// ---------- AI ----------
interface AITimer {
  lastMove: number
}
const aiTimers: Record<FactionId, AITimer> = {
  cao: { lastMove: 0 },
  liu: { lastMove: 0 },
  sun: { lastMove: 0 },
}

/** AI 每 AI_INTERVAL_MS 嘗試一次行動 */
export function runAI(state: GameState): void {
  for (const f of FACTIONS) {
    if (f.id === state.playerFactionId) continue
    const timer = aiTimers[f.id]
    if (state.elapsedMs - timer.lastMove < AI_INTERVAL_MS) continue
    timer.lastMove = state.elapsedMs
    aiOneMove(state, f.id)
  }
}

function aiOneMove(state: GameState, factionId: FactionId): void {
  // 無容量上限後改用絕對門檻：兵力 ≥ 12 才會考慮派兵（保留守軍）
  const AI_MIN_TROOPS_TO_SEND = 12
  const owned = Object.values(state.counties).filter(
    (c) => c.ownerId === factionId && c.troops >= Math.max(MIN_SEND * 2, AI_MIN_TROOPS_TO_SEND),
  )
  if (owned.length === 0) return
  // 隨機打亂後嘗試每個
  owned.sort(() => Math.random() - 0.5)
  for (const src of owned) {
    const def = COUNTY_MAP.get(src.id)
    if (!def) continue
    const neighbors = def.adjacent
      .map((id) => state.counties[id])
      .filter((c): c is CountyState => !!c)
    if (neighbors.length === 0) continue
    // 優先：中立且兵力 < 我方一半
    const half = Math.floor(src.troops / 2)
    const neutrals = neighbors.filter(
      (n) => n.ownerId === 'neutral' && n.troops < half,
    )
    const weakerEnemy = neighbors.filter(
      (n) => n.ownerId !== 'neutral' && n.ownerId !== factionId && n.troops < half - 2,
    )
    const picks = neutrals.length > 0 ? neutrals : weakerEnemy
    if (picks.length === 0) continue
    const target = picks[Math.floor(Math.random() * picks.length)]!
    sendHalf(state, src.id, target.id, factionId)
    return // 每次只出一次兵
  }
}

/** 主 tick：由 requestAnimationFrame 呼叫，dt = 距上次毫秒 */
export function tick(state: GameState, dt: number): void {
  if (state.paused || state.phase !== 'playing') return
  state.elapsedMs += dt
  applyGrowth(state)
  advanceWaves(state, dt)
  runAI(state)
  checkVictory(state)
}

// ---------- 輔助 ----------
export function ownerColor(ownerId: OwnerId): string {
  if (ownerId === 'neutral') return '#8a7a60'
  return FACTIONS.find((f) => f.id === ownerId)?.color ?? '#666'
}
export function ownerName(ownerId: OwnerId): string {
  if (ownerId === 'neutral') return '中立'
  return FACTIONS.find((f) => f.id === ownerId)?.name ?? '?'
}
