/**
 * 沿著地圖手繪邊界做 flood-fill，把每個郡的可填區域 → Uint16 mask。
 * 每像素寫入 county index（1-based；0 = 邊界/外部）。
 */

export interface RegionMasks {
  W: number
  H: number
  /** 每像素對應 county 索引（1-based），0 = 邊界/未分類 */
  mask: Uint16Array
  /** 索引 i 對應的 county id（mask 值 i+1） */
  countyIds: string[]
  /** 各郡的邊界框（圖像座標）與像素數 */
  info: Record<
    string,
    { x1: number; y1: number; x2: number; y2: number; pixels: number }
  >
}

export interface Seed {
  id: string
  xPct: number
  yPct: number
}

/** 單郡 flood-fill 上限（避免溢位把整張地圖填滿） */
const MAX_PIXELS_PER_REGION = 300_000
/** 亮度閾值：< THIS 就視為邊界線/山川/海/文字 → 停止擴散
 *  羊皮紙底色約 180-210，邊界線/文字約 60-100，把門檻放到 105 可避開文字但保留多數內陸 */
const DEFAULT_LUM_THRESHOLD = 105

export async function buildRegionMasks(
  imgUrl: string,
  seeds: Seed[],
  lumThreshold: number = DEFAULT_LUM_THRESHOLD,
): Promise<RegionMasks> {
  const img = await loadImage(imgUrl)
  const W = img.width
  const H = img.height
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const pixels = ctx.getImageData(0, 0, W, H).data

  const mask = new Uint16Array(W * H)
  const countyIds: string[] = []
  const info: RegionMasks['info'] = {}

  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i]!
    countyIds.push(s.id)
    const sx = Math.floor(s.xPct * W)
    const sy = Math.floor(s.yPct * H)
    const idx = i + 1
    const res = floodFill(pixels, mask, W, H, sx, sy, idx, lumThreshold)
    info[s.id] = res
  }

  // 第二遍：把未分類但四周都是同一郡的 0-像素補上（填文字/細縫）
  fillHoles(mask, W, H)

  return { W, H, mask, countyIds, info }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = src
  })
}

function floodFill(
  pixels: Uint8ClampedArray,
  mask: Uint16Array,
  W: number,
  H: number,
  sx: number,
  sy: number,
  countyIdx: number,
  lumThreshold: number,
): { x1: number; y1: number; x2: number; y2: number; pixels: number } {
  const start = sy * W + sx
  // 若起點已被其他郡佔用，或起點自身就是邊界（例如 seed 放到了邊線上），
  // 往四鄰嘗試找合法起點
  let actualStart = start
  if (mask[start] !== 0 || !isFillable(pixels, start, lumThreshold)) {
    actualStart = findNearestFillable(pixels, mask, W, H, sx, sy, lumThreshold)
    if (actualStart < 0) {
      return { x1: sx, y1: sy, x2: sx, y2: sy, pixels: 0 }
    }
  }

  const stack: number[] = [actualStart]
  let x1 = sx,
    y1 = sy,
    x2 = sx,
    y2 = sy
  let count = 0

  while (stack.length > 0) {
    if (count >= MAX_PIXELS_PER_REGION) break
    const i = stack.pop()!
    if (mask[i] !== 0) continue
    if (!isFillable(pixels, i, lumThreshold)) continue
    mask[i] = countyIdx
    count++
    const y = (i / W) | 0
    const x = i - y * W
    if (x < x1) x1 = x
    if (y < y1) y1 = y
    if (x > x2) x2 = x
    if (y > y2) y2 = y

    if (x > 0) stack.push(i - 1)
    if (x < W - 1) stack.push(i + 1)
    if (y > 0) stack.push(i - W)
    if (y < H - 1) stack.push(i + W)
  }
  return { x1, y1, x2, y2, pixels: count }
}

function isFillable(
  pixels: Uint8ClampedArray,
  i: number,
  lumThreshold: number,
): boolean {
  const r = pixels[i * 4]!
  const g = pixels[i * 4 + 1]!
  const b = pixels[i * 4 + 2]!
  // 避免海藍：藍明顯高於 r、g 才當海
  if (b > r + 40 && b > g + 25) return false
  // 太暗 = 邊界線/山川陰影/文字
  const lum = (r + g + b) / 3
  if (lum < lumThreshold) return false
  return true
}

/** 在 (sx, sy) 附近螺旋找一個可填的像素 */
function findNearestFillable(
  pixels: Uint8ClampedArray,
  mask: Uint16Array,
  W: number,
  H: number,
  sx: number,
  sy: number,
  lumThreshold: number,
  maxRadius = 25,
): number {
  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
        const x = sx + dx
        const y = sy + dy
        if (x < 0 || x >= W || y < 0 || y >= H) continue
        const i = y * W + x
        if (mask[i] !== 0) continue
        if (isFillable(pixels, i, lumThreshold)) return i
      }
    }
  }
  return -1
}

/** 把內部 0-像素（文字、細縫）依 4 鄰居多數決補上 */
function fillHoles(mask: Uint16Array, W: number, H: number): void {
  // 跑 2 輪以處理相鄰洞
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x
        if (mask[i] !== 0) continue
        const up = mask[i - W]!
        const dn = mask[i + W]!
        const lt = mask[i - 1]!
        const rt = mask[i + 1]!
        const counts: Record<number, number> = {}
        for (const v of [up, dn, lt, rt]) {
          if (v === 0) continue
          counts[v] = (counts[v] ?? 0) + 1
        }
        let best = 0
        let bestN = 0
        for (const [v, n] of Object.entries(counts)) {
          if (n > bestN) {
            best = Number(v)
            bestN = n
          }
        }
        if (bestN >= 3) mask[i] = best
      }
    }
  }
}
