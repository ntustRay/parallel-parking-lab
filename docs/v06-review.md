# v0.6.0：鏡面、場景與方向盤重做

2026-10-18，依實玩回饋修正 v0.5 的三個問題。本輪不再用主觀分數代替畫面與操作驗證。

| 問題 | v0.6 的實際變更 |
| --- | --- |
| 後視鏡仍太小 | 1440 × 960 下，預設側鏡外框從約 317 × 176 增至 518 × 374，面積約 3.5 倍；中央鏡加大，點擊仍可進一步放大。筆電、手機各自調整比例。 |
| 布景粗糙 | 改用 Three.js WebGL 場景，重建有圓弧與斜面的車體、輪胎、輪框、窗框、街樹與人行道，加入鋪面紋理、日光、陰影與距離霧。 |
| 方向盤怪 | 以可拖曳的三輻輪圈取代小型 CSS 圖示。方向盤左右各 540° 對應前輪最大 35°，分別顯示輪圈圈數與前輪角度；鍵盤轉向減速，放開保留轉角，X 回正。 |

## 畫面

以下圖片由正式 GitHub Actions 的 Chromium 測試更新，與部署 build 相同。

![第一人稱與大型鏡面](https://ntustray.github.io/parallel-parking-lab/screenshots/driver.png)

![可拖曳的方向盤](https://ntustray.github.io/parallel-parking-lab/screenshots/steering-quarter-turn.png)

![筆電排版](https://ntustray.github.io/parallel-parking-lab/screenshots/laptop.png)

## 操作與渲染檢查

- 拖曳輪圈四分之一圈，前輪約右轉 6°；X 同時讓輪圈與前輪回正。
- 拖曳跨過 ±180° 邊界不跳到另一側；右打滿顯示 1.50 圈與前輪 35°。
- 預設桌機側鏡至少 500 × 330 px，六種螢幕尺寸的主要控制均在視窗內。
- 所有視角共用一個 WebGL context，以 RenderTarget 在 GPU 合成鏡面，避免大鏡面反覆回讀到 CPU。
- 只有車輛、視角或畫面設定變化才重繪，移動時上限 25 fps；靜止場景保留畫面，輸入與物理模擬仍持續處理。
- 實測截圖修正過筆電鏡面遮住教練／數據、手機控制項下緣空間，以及橫向排檔標籤換行。

Three.js r180 與 MIT License 已隨專案部署，執行時不連 CDN。鏡面仍是模擬攝影機視點，場景也不是實車材質或交通環境的完整重現。
