<template>
  <div class="page">
    <div v-if="!store.state" class="empty">
      <p>尚未開局。</p>
      <NuxtLink to="/" class="link">返回主選單</NuxtLink>
    </div>
    <template v-else>
      <HUD />
      <MapView />
      <!-- BGM：autoplay 由瀏覽器策略決定，失敗時靠第一次使用者互動觸發 -->
      <audio
        ref="audioEl"
        src="/bgm/theKingdoms.mp3"
        preload="auto"
        loop
      ></audio>
      <!-- 開場教學卡 -->
      <div v-if="showTutorial" class="tutorial" @click="closeTutorial">
        <div class="tutorial-card" @click.stop>
          <h3>玩法速覽</h3>
          <ol>
            <li>
              <b>你的色塊</b>是
              <span class="me-color" :style="{ color: playerColor }">
                {{ store.nameOf(store.state.playerFactionId) }}
              </span>（★ 為首都）。每 1.5 秒 +1 兵，上限 30（首都 50）。
            </li>
            <li>
              <b>派兵：</b>按住自家色塊「<u>拖曳</u>」到<u>相鄰</u>郡放開 → 派出<u>一半</u>兵力。
            </li>
            <li>
              <b>佔領：</b>派出的兵 > 目標兵 → 佔領；否則扣光對方兵但佔不下。
            </li>
            <li>
              拖曳時：<span class="hint-ring">金環閃爍</span>的郡 = 可派的鄰居。
            </li>
            <li>
              <b>勝利：</b>消滅另外兩家，<b>一統天下</b>。
            </li>
          </ol>
          <button class="start-btn" @click="closeTutorial">我懂了，開戰！</button>
          <div class="small">（空白鍵暫停 / Esc 取消選取）</div>
        </div>
      </div>
      <!-- 勝負 overlay -->
      <div v-if="store.state.phase !== 'playing'" class="ending">
        <div class="card">
          <h2 v-if="store.state.phase === 'victory'">🏆 天下歸一</h2>
          <h2 v-else>☠ 敗北</h2>
          <p v-if="store.state.winner && store.state.winner !== store.state.playerFactionId">
            {{ store.nameOf(store.state.winner) }} 一統天下。
          </p>
          <NuxtLink to="/" class="btn-back">返回主選單</NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from '~/stores/game'
import { useBgm } from '~/composables/useBgm'
import HUD from '~/components/HUD.vue'
import MapView from '~/components/MapView.vue'

const store = useGameStore()
const router = useRouter()
const audioEl = ref<HTMLAudioElement | null>(null)
const bgm = useBgm()
const showTutorial = ref(true)

const playerColor = computed(() => store.playerColor)

function closeTutorial() {
  showTutorial.value = false
  // 解除教學時恢復遊戲
  if (store.state) store.state.paused = false
  // 教學關閉 = 使用者首次互動，順便嘗試播放 BGM（autoplay 備援）
  if (!bgm.started.value) void bgm.tryPlay()
}

function onKey(e: KeyboardEvent) {
  if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
    e.preventDefault()
    store.togglePause()
  }
  if (e.code === 'Escape') {
    store.deselect()
  }
}

// autoplay 被擋時，第一次互動後再嘗試
function onFirstInteract() {
  if (!bgm.started.value) void bgm.tryPlay()
}

onMounted(() => {
  if (!store.state) {
    router.push('/')
    return
  }
  // 教學卡顯示期間先暫停，玩家按下「我懂了」才解除
  if (store.state && showTutorial.value) store.state.paused = true
  store.startLoop()
  window.addEventListener('keydown', onKey)
  bgm.setAudio(audioEl.value)
  void bgm.tryPlay()
  window.addEventListener('pointerdown', onFirstInteract, { once: false })
  window.addEventListener('keydown', onFirstInteract, { once: false })
})

onBeforeUnmount(() => {
  store.stopLoop()
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('pointerdown', onFirstInteract)
  window.removeEventListener('keydown', onFirstInteract)
  if (audioEl.value) audioEl.value.pause()
  bgm.setAudio(null)
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: radial-gradient(ellipse at center, #2a2018 0%, #0f0b07 80%);
}
.empty {
  text-align: center;
  padding: 60px 20px;
  color: #e8dcc4;
}
.link { color: #d4af37; }
.ending {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.card {
  background: #2a2018;
  border: 2px solid #d4af37;
  border-radius: 8px;
  padding: 40px 60px;
  text-align: center;
}
.card h2 {
  color: #d4af37;
  font-size: 36px;
  letter-spacing: 6px;
  margin: 0 0 12px 0;
}
.btn-back {
  display: inline-block;
  margin-top: 20px;
  background: #b73229;
  color: #fff;
  padding: 10px 20px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
}
/* --- 開場教學卡 --- */
.tutorial {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 15;
  padding: 20px;
}
.tutorial-card {
  background: #2a2018;
  border: 2px solid #d4af37;
  border-radius: 8px;
  padding: 28px 36px;
  max-width: 520px;
  color: #e8dcc4;
  box-shadow: 0 0 40px rgba(212, 175, 55, 0.3);
}
.tutorial-card h3 {
  color: #d4af37;
  margin: 0 0 14px;
  font-size: 24px;
  letter-spacing: 2px;
  text-align: center;
}
.tutorial-card ol {
  padding-left: 20px;
  line-height: 1.7;
  font-size: 15px;
  margin: 0 0 18px;
}
.tutorial-card li { margin-bottom: 6px; }
.tutorial-card b { color: #d4af37; }
.tutorial-card u { text-decoration-color: #d4af37; text-underline-offset: 2px; }
.me-color { font-weight: bold; }
.hint-ring {
  color: #ffe070;
  font-weight: bold;
}
.start-btn {
  display: block;
  width: 100%;
  background: #b73229;
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  letter-spacing: 2px;
}
.start-btn:hover { background: #d13e33; }
.small {
  text-align: center;
  color: #a89a7e;
  font-size: 12px;
  margin-top: 10px;
}
</style>
