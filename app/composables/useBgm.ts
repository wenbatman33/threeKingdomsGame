/**
 * 共用 BGM 狀態：音量、靜音切換、播放請求。
 * 由 play.vue 的 <audio> 元素實際擁有；HUD 透過這層 composable 控制。
 */
import { ref, watch } from 'vue'

// localStorage key
const STORAGE_KEY = 'bgm-settings'

// 預設值；若瀏覽器 localStorage 有資料則覆寫
const DEFAULTS = { muted: false, volume: 0.45 }
const loaded = loadSettings()
const muted = ref(loaded.muted)
const volume = ref(loaded.volume)
const audioRef = ref<HTMLAudioElement | null>(null)
const started = ref(false)

function loadSettings(): { muted: boolean; volume: number } {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const obj = JSON.parse(raw) as Partial<typeof DEFAULTS>
    return {
      muted: typeof obj.muted === 'boolean' ? obj.muted : DEFAULTS.muted,
      volume: typeof obj.volume === 'number' && obj.volume >= 0 && obj.volume <= 1
        ? obj.volume
        : DEFAULTS.volume,
    }
  } catch {
    return DEFAULTS
  }
}

function saveSettings() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ muted: muted.value, volume: volume.value }),
    )
  } catch {
    // ignore quota / privacy-mode errors
  }
}

// 任一值變更都寫回 localStorage
watch([muted, volume], saveSettings)

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
