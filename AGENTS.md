# AGENTS.md

- 慢慢停使用瀏覽器 ES modules 和 `vendor/` 中的 Three.js。用 Node.js 22 以上執行 `npm start`，瀏覽器需支援 WebGL 2。
- `vehicle-spec.js`、`physics.js`、`courses.js` 和 `simulation.js` 共用車輛與課程規則。改車輛尺寸或碰撞時，一起核對兩側鏡像、示範與入位評分。
- 模型變更先讀 [模型資產說明](assets/README.md) 和 [車模架構](docs/model-architecture.md)，保留動態節點和單檔離線建置所需資產。
- 跑 `npm test` 和 `npm run build`。變更影響離線版時加跑 `npm run build:offline`，調整車艙或鏡頭時依 [README.md](README.md) 檢查四向車內畫面。迭代項目在 [docs/TODO.md](docs/TODO.md)。
