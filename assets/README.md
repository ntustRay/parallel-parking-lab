# 車輛模型介面

兩個 GLB 均為本專案製作，沿用專案 MIT 授權。沒有外部貼圖、壓縮解碼器或網路依賴。

| 檔案 | 用途 | 幾何預算 |
| --- | --- | --- |
| sedan-cabin.glb | 第一人稱車艙，動態儀表與鏡面由程式接上 | 35,000 triangles、75 meshes 以內 |
| sedan-exterior.glb | 其他視角與場景中的車輛 | 保留輪軸及車燈節點 |
| model-budget.json | build:models 產生的體積與幾何統計 | 供製作時核對 |

座標為公尺、Y 向上、車頭朝 -Z。車身中心為原點；車長 4.4、車寬 1.78、車高 1.435、軸距 2.64。精確設定以 vehicle-spec.js 為準。

## 車內必要節點

| 名稱 | 功能 | 位置 |
| --- | --- | --- |
| sedan-cabin | 模型 root，userData 帶有 units: metres、forward: -Z、car 尺寸 metadata | 原點 |
| steering-wheel | 可以旋轉的整組方向盤，保留原本轉軸方向 | (-0.4, 0.89, -0.30) |
| instrument-display | 960 × 340 動態儀表的掛載點 | (-0.4, 0.884, -0.645) |
| mirror-left | 左鏡面掛載點 | (-0.984, 0.98, -0.492) |
| mirror-right | 右鏡面掛載點 | (0.984, 0.98, -0.492) |

車內玻璃開口須保持通透；門板、底板與車頂須完整封閉。unit tests 會對實際 GLB 執行射線檢查，不使用替身幾何取代。

## 車外必要節點

| 名稱或前綴 | 功能 |
| --- | --- |
| front-wheel-left、front-wheel-right | 前輪轉向 pivot，子網格包含輪胎與輪框 |
| rear-wheel-left、rear-wheel-right | 後輪位置 |
| brake- | 兩個煞車燈 |
| reverse- | 兩個倒車燈 |
| indicator- | 四個方向燈 |
| body-paint（material 名稱） | 每台車可獨立更換顏色的車漆 |

輪軸位置由車身尺寸與軸距決定；更改外形時須維持輪胎接地及碰撞輪廓一致。替換模型後執行 npm test 檢查介面，並核對四向車內畫面。
