# 慢慢停 · 停車與低速駕駛練習

坐進駕駛座，用三面後視鏡練習停車、S 彎往返與迴轉。

繁體中文、免帳號，支援鍵盤、滑鼠與觸控。預設第一人稱，也能切換斜俯視、正上方與跟車視角，觀察車身和路緣的距離。成績與操作偏好儲存在目前的瀏覽器。

**[開始練習](https://ntustray.github.io/parallel-parking-lab/)** · [版本下載與更新紀錄](https://github.com/ntustRay/parallel-parking-lab/releases) · [畫面圖庫](https://ntustray.github.io/parallel-parking-lab/screenshots/)

![第一人稱駕駛畫面](https://ntustray.github.io/parallel-parking-lab/screenshots/02-driver.webp)

## 練習項目

| 課程 | 練習內容 |
| --- | --- |
| 路邊停車 | 車尾對齊起步，斜退入格、回正直退，再反打微調 |
| 倒車入庫 | 定位、倒退轉入 90° 車格，再對齊格線直退 |
| S 彎前進／倒退 | 前進通過兩個彎，在末端停穩換 R，沿原路倒回起點 |
| 雙線道迴轉 | 在 6.5 m 道路前進、倒退騰出空間，再轉入反向車道 |
| 四線道迴轉 | 在 13 m 道路完成大迴轉，沿反向車道停入終點 |

各課程支援左右鏡像、四階段教學與完整示範。可逐步暫停觀察，或調整示範播放速度；示範不計入個人成績。

練習模式提供教練、預測軌跡與即時數據；測驗模式收起輔助，要求全程零碰撞。完成時須車身完全入框、方向對齊、煞停並排 P，再提交成績。S 彎與迴轉另會檢查指定步驟是否完成。

## 開始練習

1. 選擇課程、難度與方向，初次操作可開啟低速練習。
2. 踩住煞車，選 D 前進或 R 倒車；放開煞車後車輛會緩慢蠕行。
3. 透過後視鏡與轉頭觀察控制距離。需要引導時按 T 展開教學、U 觀看示範。
4. 完成指定路線並停妥後排 P，按 E 提交。可查看成績、繼續調整或進入下一課。

左右與中央後視鏡在四種視角都可使用，點擊鏡面可放大。倒車鏡頭由 B 獨立開關，音效與音樂可在設定中調整。

## 操作

| 功能 | 操作方式 |
| --- | --- |
| 轉向 | ←／→ 或 A／D；也可拖曳方向盤 |
| 固定打滿／回正 | Z 左打滿、X 回正、V 右打滿 |
| 油門 | W／↑，前進與倒車皆相同 |
| 煞車 | S／↓／Space |
| 排檔 | F 前進、R 倒車、P 停車；停穩後 Q 切換 D／R |
| 轉頭 | 拖曳擋風玻璃；按住 J／L 向左／右看，K 看正前方 |
| 切換視角 | 1 駕駛座、2 斜俯視、3 正上方、4 跟車；C 依序切換 |
| 教學與軌跡 | T 收合教學、H 切換預測軌跡 |
| 示範與觀察 | U 開始／停止示範、I 暫停／繼續、按住 O 觀察參考點 |
| 倒車鏡頭 | B |
| 提交／重來／設定 | E／Backspace／G |
| 靜音／音樂／雙黃燈 | M／N／Y |
| 完整快捷鍵說明 | ?／F1 |

方向鍵約半秒從置中打滿，放開後快速回正；Z／V 的打滿輔助會固定轉角，按 X 回正。觸控裝置可使用畫面上的方向盤、排檔與踏板。

## 離線使用

從 [Releases](https://github.com/ntustRay/parallel-parking-lab/releases/latest) 的 Assets 下載單一 HTML 檔，用支援 WebGL 2 的瀏覽器開啟。3D 模組與樣式已內嵌，可離線練習。

也可以自行產生：

```sh
npm run build:offline
# 輸出 dist/parking-lab-v<version>.html
```

## 本機開發

需要 Node.js 22+，瀏覽器須支援 WebGL 2。Three.js 已隨專案放在 `vendor/`，啟動遊戲不需要安裝 npm 套件。

```sh
npm start
# http://127.0.0.1:4173
```

建立靜態網站：

```sh
npm run build
# 輸出 _site/
```

產生操作截圖與 WebP 圖庫時，再安裝擷取用瀏覽器：

```sh
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium
npm run build
npm run screenshots
# 輸出 _site/screenshots/，包含圖庫與 manifest.json
```

遊戲程式更新時，GitHub Actions 負責 build、操作截圖與 Pages 部署；純文件或發佈流程更新會保留線上遊戲與圖庫。版本更新發布在 [Releases](https://github.com/ntustRay/parallel-parking-lab/releases)，以 [CHANGELOG.md](CHANGELOG.md) 作為發佈說明來源，並附上由對應 tag 建立的離線 HTML；重跑不覆寫既有 tag 或已上傳的檔案。

## 程式結構

| 檔案 | 責任 |
| --- | --- |
| `physics.js`、`courses.js` | 車輛模型、課程配置、碰撞、路線進度與評分 |
| `training.js`、`lessons.js` | 示範路線、四階段教學與觀察點 |
| `scene.js`、`renderer.js`、`cockpit.js` | 3D 場景、車內視角、後視鏡與 GPU 合成 |
| `game.js`、`steering.js` | 模擬迴圈、操作與介面狀態 |
| `audio.js`、`shortcuts.js` | 音樂音效與快捷鍵 |
| `tools/` | 靜態／離線產物、操作截圖及版本發佈 |

場景採用公尺尺度的緊湊房車與低速車輛近似模型，適合練習觀察與操作順序；車內視線尚未經實車標定。迴轉課程使用封閉訓練場景。

## 授權

程式碼採 [MIT License](LICENSE)。Three.js 的版權聲明保留於 [vendor/THREE-LICENSE.txt](vendor/THREE-LICENSE.txt)。
