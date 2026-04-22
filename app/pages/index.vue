<template>
  <div class="menu">
    <h1>三國志・州郡爭霸</h1>
    <p class="sub">state.io 風 ・ 即時戰略 ・ 三家相爭</p>
    <div class="factions">
      <button
        v-for="f in factions"
        :key="f.id"
        class="faction-btn"
        :style="{ borderColor: f.color, color: f.color }"
        @click="pick(f.id)"
      >
        <div class="name">{{ f.name }}</div>
        <div class="lord">{{ f.lordName }}</div>
        <div class="capital">起於 {{ capitalName(f.capitalId) }}</div>
      </button>
    </div>
    <div class="rule">
      <h3>玩法</h3>
      <ol>
        <li><b>按住自家郡</b>拖曳到相鄰郡放開 → 派出一半兵力。</li>
        <li>攻方 &gt; 守方兵力則占領，剩餘兵力進駐；否則消耗對方兵力。</li>
        <li>自家郡每 1.5 秒 +1 兵，至容量上限（普通 30、首都 50）。</li>
        <li>消滅其他兩家即為勝利。</li>
      </ol>
      <div class="extra">
        覺得郡的位置不對？
        <NuxtLink to="/editor" class="edit-link">→ 開啟座標編輯器</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '~/stores/game'
import { COUNTY_MAP } from '~/game/mapData'
import type { FactionId } from '~/game/types'

const store = useGameStore()
const router = useRouter()
const factions = store.factions

function capitalName(id: string) {
  return COUNTY_MAP.get(id)?.name ?? id
}
function pick(id: FactionId) {
  store.startNewGame(id)
  router.push('/play')
}
</script>

<style scoped>
.menu {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
  text-align: center;
}
h1 {
  color: #d4af37;
  letter-spacing: 8px;
  font-size: 40px;
  margin: 0;
}
.sub {
  color: #a89a7e;
  font-size: 14px;
  letter-spacing: 4px;
  margin-bottom: 32px;
}
.factions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}
.faction-btn {
  background: rgba(42, 32, 24, 0.8);
  border: 2px solid;
  border-radius: 6px;
  padding: 24px 16px;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s;
  font-family: inherit;
}
.faction-btn:hover {
  transform: translateY(-3px);
  background: rgba(58, 45, 32, 0.9);
}
.faction-btn .name {
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 4px;
  margin-bottom: 4px;
}
.faction-btn .lord {
  color: #e8dcc4;
  font-size: 14px;
  margin-bottom: 6px;
}
.faction-btn .capital {
  color: #a89a7e;
  font-size: 12px;
}
.rule {
  background: rgba(42, 32, 24, 0.5);
  border: 1px solid #3a2d20;
  border-radius: 6px;
  padding: 16px 24px;
  text-align: left;
  color: #e8dcc4;
}
.rule h3 { color: #d4af37; margin-top: 0; }
.rule ol { line-height: 1.8; font-size: 14px; padding-left: 20px; }
.rule b { color: #d4af37; }
.extra { margin-top: 12px; font-size: 13px; color: #a89a7e; text-align: center; }
.edit-link { color: #d4af37; text-decoration: none; font-weight: bold; }
.edit-link:hover { text-decoration: underline; }
</style>
