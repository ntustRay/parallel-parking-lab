# 慢慢停 · Parking Lab

一個讓自己慢慢練習路邊停車的 3D 瀏覽器遊戲。繁體中文、免帳號、無時間限制。

**[開始練習](https://ntustray.github.io/parallel-parking-lab/)** · [測試與截圖](https://github.com/ntustRay/parallel-parking-lab/actions)

## 已實作

- 自製 Canvas 3D renderer：街道、路緣、建築、樹木、車輛與轉動的前輪。
- Rear-axle bicycle model，4.5 × 1.8 m 車身、2.7 m 軸距、最大 35° 前輪轉角。
- P / R / D、低速油門、煞車優先、停穩才可換檔、持續方向盤轉角。
- 四種視角：斜俯視、正上方、跟車、駕駛座。
- 三種車位長度、左右側停車、練習／測驗模式。
- 即時教練、倒車預測軌跡、路緣距離、角度、碰撞及前後修正計數。
- SAT 車身碰撞；四角入位、車身角度 < 8° 且停穩才通過。
- 依碰撞、修正與位置評分；最近 50 次結果保存在 localStorage。
- 桌機及觸控操作；失去焦點與觸控取消時會放開踏板。

## 操作

| 操作 | 鍵盤 |
| --- | --- |
| 方向盤 | ← → / A D；放開後保留轉角 |
| 回正 | X |
| 油門 | ↑ / W |
| 煞車 | Space / ↓ / S |
| 前進／倒車 | 停穩後 Q，或按 P / R / D |
| 換視角 | C |
| 重新練習 | R |
| 顯示／隱藏軌跡 | H |

建議先用正上方視角理解車身如何繞後輪旋轉，再換跟車或駕駛座練習。練習目標是車身四角在框內、與路緣平行、完全停穩。

## 本機執行

需要 Node.js 22+。遊戲沒有 runtime dependencies，不需要 npm install。

```sh
npm start
# http://127.0.0.1:4173
npm test
```

瀏覽器 E2E：

```sh
npm install --no-save --package-lock=false @playwright/test@1.56.1
npx playwright install chromium
npx playwright test
```

GitHub Actions 會執行物理測試、Chromium E2E，擷取四種視角及手機畫面，保存 HTML report、失敗 trace 和截圖；測試成功後才部署 GitHub Pages。Repository Settings → Pages → Source 設為 GitHub Actions。

## 專案結構

| 檔案 | 責任 |
| --- | --- |
| physics.js | 純函式車輛模型、SAT 碰撞、場景與評分 |
| training.js | 以實際物理模擬規劃無碰撞的示範駕駛 |
| renderer.js | 3D 投影、場景繪製與四種攝影機 |
| game.js | 固定步長模擬、操作、教練、UI、成績紀錄 |
| tests/ | Node.js 原生物理及完整入位測試 |
| e2e/ | Playwright 使用者流程及響應式截圖 |

## 迭代清單

- [x] v0.1：路邊停車、四種視角、即時教練與評分。
- [x] 煞車優先、停穩換檔、左右側鏡像、接觸碰撞計數。
- [x] GitHub Actions 測試、截圖與 Pages 部署。
- [ ] 根據實玩回饋校準教練參考點與車身軌跡。
- [ ] 加入後視鏡與獨立倒車鏡頭。
- [ ] 不同車型與自訂軸距。
- [x] v0.2：低速練習、碰撞檢查的示範入位（寬鬆與標準車位），不計入個人成績。
- [ ] 個人練習軌跡重播與緊湊車位多次修正示範。
- [ ] 更多關卡：倒車入庫、斜角車位、S 型練習。

## 範圍

玩法參考 [Parking Practice](https://parkingpractice.com/)，程式、介面與場景獨立實作，沒有複製原站素材或原始碼。這是轉向幾何與空間練習，不模擬實車輪胎、懸吊、交通與駕駛觀察，不代表任何地區的官方考照標準。

程式碼採 MIT License。
