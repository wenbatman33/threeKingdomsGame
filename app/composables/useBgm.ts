/**
 * 共用 BGM 狀態：音量、靜音切換、播放請求。
 * 由 play.vue 的 <audio> 元素實際擁有；HUD 透過這層 composable 控制。
 */
import { ref } from 'vue'

const muted = ref(false)
const volume = ref(0.45)
const audioRef = ref<HTMLAudioElement | null>(null)
const started = ref(false)

function setAudio(el: HTMLAudioElement | null) {
  audioRef.value = el
  if (el) {
    el.volume = muted.value ? 0 : volume.value
    el.loop = true
  }
}

async function tryPlay() {
  const el = audioRef.value
  if (!el) return
  try {
    await el.play()
    started.value = true
  } catch {
    // autoplay 被瀏覽器擋；等使用者互動後重試
    started.value = false
  }
}

function toggleMute() {
  muted.value = !muted.value
  const el = audioRef.value
  if (!el) return
  el.volume = muted.value ? 0 : volume.value
  if (!muted.value && !started.value) {
    void tryPlay()
  }
}

function setVolume(v: number) {
  volume.value = Math.max(0, Math.min(1, v))
  const el = audioRef.value
  if (el && !muted.value) el.volume = volume.value
}

export function useBgm() {
  return { muted, volume, started, setAudio, tryPlay, toggleMute, setVolume }
}
