/**
 * Pinia Store：state.io 風三國志
 */
import { defineStore } from 'pinia'
import { COUNTIES, COUNTY_MAP, FACTIONS, FACTION_MAP } from '~/game/mapData'
import {
  createInitialState,
  ownerColor,
  ownerName,
  sendHalf,
  tick,
} from '~/game/logic'
import type { FactionId, GameState, OwnerId } from '~/game/types'

export const useGameStore = defineStore('game', {
  state: () => ({
    state: null as GameState | null,
    selectedCountyId: null as string | null,
    rafId: 0,
    lastFrame: 0,
  }),

  getters: {
    counties: () => COUNTIES,
    countyMap: () => COUNTY_MAP,
    factions: () => FACTIONS,
    factionMap: () => FACTION_MAP,

    selectedCounty(state) {
      if (!state.state || !state.selectedCountyId) return null
      return state.state.counties[state.selectedCountyId] ?? null
    },

    playerColor(state) {
      if (!state.state) return '#666'
      return (
        FACTIONS.find((f) => f.id === state.state!.playerFactionId)?.color ??
        '#666'
      )
    },

    /** 各勢力目前控制郡數 */
    ownerCounts(state) {
      const counts: Record<string, number> = {
        cao: 0,
        liu: 0,
        sun: 0,
        neutral: 0,
      }
      if (!state.state) return counts
      for (const c of Object.values(state.state.counties)) {
        counts[c.ownerId] = (counts[c.ownerId] ?? 0) + 1
      }
      return counts
    },

    colorOf: () => (ownerId: OwnerId) => ownerColor(ownerId),
    nameOf: () => (ownerId: OwnerId) => ownerName(ownerId),
  },

  actions: {
    startNewGame(playerFactionId: FactionId) {
      this.state = createInitialState(playerFactionId)
      this.selectedCountyId = null
    },

    /** 點擊郡：選中自家郡；若已選中後再點相鄰的，就派兵 */
    tapCounty(countyId: string) {
      if (!this.state) return
      const cur = this.state.counties[countyId]
      if (!cur) return
      const sel = this.selectedCountyId
      // 已選中且點的是相鄰 → 派兵
      if (sel && sel !== countyId) {
        const selCounty = this.state.counties[sel]
        const def = COUNTY_MAP.get(sel)
        if (
          selCounty &&
          selCounty.ownerId === this.state.playerFactionId &&
          def?.adjacent.includes(countyId)
        ) {
          const ok = sendHalf(this.state, sel, countyId, this.state.playerFactionId)
          if (ok) {
            this.selectedCountyId = null
            return
          }
        }
      }
      // 否則：若是自家郡就選中，否則取消
      if (cur.ownerId === this.state.playerFactionId) {
        this.selectedCountyId = countyId
      } else {
        this.selectedCountyId = null
      }
    },

    deselect() {
      this.selectedCountyId = null
    },

    togglePause() {
      if (this.state) this.state.paused = !this.state.paused
    },

    startLoop() {
      if (this.rafId || !this.state) return
      this.lastFrame = performance.now()
      const loop = (now: number) => {
        if (!this.state) return
        const dt = now - this.lastFrame
        this.lastFrame = now
        tick(this.state, dt)
        if (this.state.phase !== 'playing') {
          this.rafId = 0
          return
        }
        this.rafId = requestAnimationFrame(loop)
      }
      this.rafId = requestAnimationFrame(loop)
    },

    stopLoop() {
      if (this.rafId) cancelAnimationFrame(this.rafId)
      this.rafId = 0
    },
  },
})
