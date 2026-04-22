# 三國志・州郡爭霸

state.io 風格 ・ 即時戰略 ・ 三家相爭

**🎮 線上試玩：** https://wenbatman33.github.io/threeKingdomsGame/

## 玩法

1. **按住自家郡**，拖曳到相鄰郡放開 → 派出一半兵力
2. 攻方 > 守方兵力則占領，剩餘兵力進駐；否則消耗對方兵力
3. 自家郡每 1.5 秒 +1 兵，至容量上限（普通 30、首都 50）
4. 消滅其他兩家即為勝利

## 三勢力

- **曹操軍**（藍）起於潁川
- **劉備軍**（綠）起於蜀郡
- **孫權軍**（紅）起於吳郡

地圖共 40 郡、13 州，還原東漢末年州郡分布。

## 本機開發

```bash
npm install
npm run dev    # http://localhost:3333
```

## 技術棧

Nuxt 4 (SPA) + Vue 3 + Pinia + SVG overlay + Playwright E2E

## 額外頁面

- `/editor` — 座標編輯器（拖曳郡位置並存到 localStorage）
