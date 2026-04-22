/**
 * State.io 風遊戲邏輯（純函式）
 */
import {
  AI_INTERVAL_MS,
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

/** 成長：已占領郡每 GROW_INTERVAL_MS 加 1 troop，至 capacity */
export function applyGrowth(state: GameState): void {
  const t = state.elapsedMs
  for (const c of Object.values(state.counties)) {
    if (c.ownerId === 'neutral') continue
    while (c.nextGrowAt <= t && c.troops < c.capacity) {
      c.troops += 1
      c.nextGrowAt += GROW_INTERVAL_MS
    }
    // 到上限後停擺
    if (c.troops >= c.capacity && c.nextGrowAt < t) {
      c.nextGrowAt = t + GROW_INTERVAL_MS
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
  state.waves.push(wave)
  return true
}

/** 推進 waves；抵達者觸發戰鬥/增援 */
export function advanceWaves(state: GameState, dt: number): void {
  const arrived: Wave[] = []
  for (const w of state.waves) {
    w.progress += w.speed * dt
    if (w.progress >= 1) arrived.push(w)
  }
  state.waves = state.waves.filter((w) => w.progress < 1)
  for (const w of arrived) resolveArrival(state, w)
}

function resolveArrival(state: GameState, w: Wave): void {
  const to = state.counties[w.toId]
  if (!to) return
  if (to.ownerId === w.ownerId) {
    // 增援（容量上限）
    to.troops = Math.min(to.capacity, to.troops + w.troops)
    return
  }
  // 敵 or 中立 — 戰鬥
  const diff = w.troops - to.troops
  if (diff > 0) {
    // 占領
    to.ownerId = w.ownerId
    to.troops = Math.min(to.capacity, diff)
    to.nextGrowAt = state.elapsedMs + GROW_INTERVAL_MS
  } else {
    // 攻方潰敗
    to.troops = Math.max(0, to.troops - w.troops)
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
  // 找所有自家郡且有 > 50% 容量的兵力
  const owned = Object.values(state.counties).filter(
    (c) => c.ownerId === factionId && c.troops >= Math.max(MIN_SEND * 2, c.capacity * 0.4),
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
