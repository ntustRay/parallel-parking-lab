# 慢慢停 · 第一人稱停車練習

**坐進駕駛座，用後視鏡與車內視線練習路邊停車。**

預設就是第一人稱。看左右後視鏡確認車身與路緣的相對位置，轉頭觀察，控制方向盤、油門與煞車，把車慢慢倒進去。繁體中文、免帳號、無時間限制。

**[開始練習](https://ntustray.github.io/parallel-parking-lab/)** · [部署狀態](https://github.com/ntustRay/parallel-parking-lab/actions)

![目前第一人稱畫面](https://ntustray.github.io/parallel-parking-lab/screenshots/02-driver.webp)

## 操作步驟截圖

[最新完整圖庫](https://ntustray.github.io/parallel-parking-lab/screenshots/) · 每次 main 部署更新；Actions 另保留 14 天的 WebP artifact。圖庫附版本、commit 與產生時間。

| 觀察步驟 | 駕駛座 | 俯視比例 |
| --- | --- | --- |
| 1. 車尾已對齊、確認周圍 | [車內](https://ntustray.github.io/parallel-parking-lab/screenshots/03-position.webp) | [俯視](https://ntustray.github.io/parallel-parking-lab/screenshots/03-position-top.webp) |
| 2. 保留起轉空間 | [車內](https://ntustray.github.io/parallel-parking-lab/screenshots/04-rear-align.webp) | [俯視](https://ntustray.github.io/parallel-parking-lab/screenshots/04-rear-align-top.webp) |
| 3. 朝路緣轉入、回正直退 | [車內](https://ntustray.github.io/parallel-parking-lab/screenshots/05-turn-straight.webp) | [俯視](https://ntustray.github.io/parallel-parking-lab/screenshots/05-turn-straight-top.webp) |
| 4. 反打、平行回正與微調 | [車內](https://ntustray.github.io/parallel-parking-lab/screenshots/06-counter-adjust.webp) | [俯視](https://ntustray.github.io/parallel-parking-lab/screenshots/06-counter-adjust-top.webp) |

[設定](https://ntustray.github.io/parallel-parking-lab/screenshots/01-setup.webp) · [車尾對齊觀察](https://ntustray.github.io/parallel-parking-lab/screenshots/04-rear-reference.webp) · [前車角與路緣](https://ntustray.github.io/parallel-parking-lab/screenshots/05-tail-reference.webp) · [入位結束](https://ntustray.github.io/parallel-parking-lab/screenshots/08-parked.webp) · [放大鏡面](https://ntustray.github.io/parallel-parking-lab/screenshots/09-mirror.webp) · [評分畫面（尚未入位）](https://ntustray.github.io/parallel-parking-lab/screenshots/10-result.webp) · [手機](https://ntustray.github.io/parallel-parking-lab/screenshots/11-mobile.webp)

圖庫另含四種視角的三面後視鏡，以及[手動開啟倒車鏡頭](https://ntustray.github.io/parallel-parking-lab/screenshots/13-driver-rear-on.webp)。43 張畫面由獨立腳本操作介面產生。示範在實際階段暫停後截圖，不做分數斷言、圖片比對、E2E 或 unit test；截圖異常不阻擋遊戲部署。

## 免伺服器試玩

執行 `npm run build:offline`，產生 `dist/parking-lab-v1.0.0.html`。下載／複製這一個檔案，用 Chrome 或 Edge 開啟即可；所有 3D 模組及樣式已內嵌，不依賴 localhost 或 CDN。R 檔後踩 W／↑ 倒車，S／↓／Space 煞車。

## v1.0.0 路邊停車完整版本

- 標準格恢復 6 × 2.5 m，相鄰車各自在自己的完整車格置中，車尾對齊起步；另有 5.5 × 2.5 m 與 5 × 2.3 m 車格。
- 方向鍵及打滿按鈕約 0.5 秒從置中打滿，左右全行程約 1 秒；放開按鍵及滑鼠都保持轉角，按 X 才回正。
- 移除自動回正選項及其舊版設定入口，避免已儲存的偏好恢復不符合本版的控制方式。
- 車位長寬參考[監理服務網小型車停車格劃設範圍](https://www.mvdis.gov.tw/webMvdisLaw/Download.aspx?ID=1474&type=Law)，此處採 6 × 2.5 m 為標準練習格。
- 接下來依序發展倒車入庫、S 彎前進／倒退、雙線道與四線道路邊迴轉；項目完成後整合為 v2.0。

## v0.15.0 車身比例、完整停車格與介面

- 保留 4.40 m 緊湊房車的公尺比例，車頭尾收角、前後玻璃有斜度；碰撞輪廓同步貼合保險桿。
- 前後車各自在自己的車格置中，三格都有完整標線。標準格中，前後車保險桿各離目標格邊 1.20 m。
- 起點車尾精確對齊前車、車側相距 50 cm。教學依實際完整車身掃掠保留起轉空間，左右側使用同一模型。
- 第一人稱與觀察視角採各自版面：鏡頭有獨立位置，教練播放控制固定顯示，觀察模式底部操作列高度 168 px。
- [起點俯視](https://ntustray.github.io/parallel-parking-lab/screenshots/18-start-alignment-top.webp) · [車身造型](https://ntustray.github.io/parallel-parking-lab/screenshots/19-start-sedan-orbit.webp) · [全開面板](https://ntustray.github.io/parallel-parking-lab/screenshots/20-start-driver-panels.webp) · [手機全開](https://ntustray.github.io/parallel-parking-lab/screenshots/21-mobile-all-panels.webp)

## v0.14.1 發版流程修正

- 修正 versions job 因補建歷史 tag 遭 GitHub 403 拒絕，導致整體 workflow 顯示失敗。
- 自動標記本輪 build 的當前版本；歷史 tag 不納入每次部署。當前 tag 建立失敗仍會使該 job 失敗。
- 標籤請求加入 15 秒 timeout，並限制 tag、build 與 deploy job 的最長時間。

## v0.14.0 場景與車輛回饋

- 車身加入清漆與日光環境反射、五輻輪圈與接地陰影；保留近似實車尺寸及既有第一人稱眼位。
- 煞車燈隨煞車亮起、R 檔亮倒車燈；新增雙黃燈按鈕與 Y 快捷鍵，外觀及車內儀表同步。
- 目標車格增加低彩度填色及四角提示，預測軌跡在即將碰撞處以紅色收尾。
- 兩種關卡三種尺寸都可看示範，自己入位停穩後會提示按 E 提交。
- 圖庫新增倒車入庫四步的駕駛座／俯視、快捷鍵、音訊設定及手機橫向截圖。
- [倒車入庫截圖](https://ntustray.github.io/parallel-parking-lab/screenshots/14-garage-2-top.webp) · [快捷鍵](https://ntustray.github.io/parallel-parking-lab/screenshots/15-shortcuts.webp) · [音訊設定](https://ntustray.github.io/parallel-parking-lab/screenshots/16-audio.webp)

## v0.13.0 聲音、回饋與快捷鍵

- 按鈕、換檔、碰撞、成功音效及輕柔背景音樂；首次操作後開始播放，切到背景或開啟設定／說明時暫停音樂。
- M 全部靜音、N 音樂開關；設定中可分別調整音效與音樂音量，選擇會保存在此瀏覽器。聲音完全在本地合成，不需下載音樂檔。
- R 檔移動時，依車身至相鄰車輛與邊界的最近距離發出接近提示。碰撞有短暫邊框回饋，停妥成功有提示音。
- 常用按鈕標示快捷鍵；「快捷鍵」或 ?／F1 開啟完整說明。F 前進、R 倒車、P 停車；Z／X／V 左打滿／回正／右打滿；1–4 視角、T 教學、B 倒車顯影、U 示範、I 示範暫停、O 按住觀察、E 提交、G 設定。原有 W／S／A／D、方向鍵、Space、Q、C、H、J／K／L 保留。
- 表單、選單與滑桿有焦點時，駕駛快捷鍵停用；按鈕的 Enter 仍使用原生操作。
- Actions 在 build 成功後為當前 package.json 版本建立 annotated tag；重跑保留既有 tag。v0.11–v0.13 的歷史 commit 已保留，舊 tag 另列待辦，需要足夠的 workflow 權限。

## v0.12.0 倒車入庫

- 設定可選「路邊停車」或「倒車入庫」，兩種關卡都支援左右側與第一人稱、後視鏡。
- 入庫格：友善 5.6 × 2.8 m、寬鬆 5.8 × 3 m、進階 5.2 × 2.6 m；練習車維持 4.4 × 1.78 m。
- 入庫專用四步引導：定位、轉入、回正直退、停妥。示範仍走同一套轉向與碰撞模型，可每步暫停觀察。
- 車格的方向、車身入框與評分改用共同的局部座標；入庫時儀表顯示後方餘裕和格線夾角。

## v0.11.0 更容易完成的練習

- 練習用緊湊房車 4.40 × 1.78 × 1.435 m，軸距 2.64 m，前／後懸 0.84／0.92 m；長度較前版縮短約 5%。這是近似真實比例的練習模型，並非原廠車型尺寸。
- 友善格 6.5 × 2.6 m（預設）、寬鬆格 7 × 2.6 m、進階格 6 × 2.5 m；道路每向 3.25 m、兩側停車帶各 2.6 m，共 11.7 m。
- 新玩家預設低速與「保持轉角」，可以分步打滿、倒退、煞停，再按 X 回正；取消勾選即可使用原本的放手回正。舊玩家儲存的低速選擇保留。
- [後續版本與待辦](docs/TODO.md)。下方尺寸與檢查紀錄屬各版本歷史。

## v0.10.0 四步教學與比例

- 依[四步教學](https://blog.mio.com/tw/life-style/unique/pull-over/)整理為「評估定位 → 車尾標齊 → 轉入後回正直退 → 反打與平行微調」。[藍鯨影片](https://www.youtube.com/watch?v=uikA64IpoPM)保留作視線觀察參考。
- 點「教學／輔助」可看四步驟示範；可勾選「每步暫停觀察」、手動暫停、按住觀察參考點，放開後視線平順回到前方。拖曳可往後側看。
- 示範方向盤、踏板燈號與教練提示使用同一段動作；暫停時鎖定示範車況，轉頭仍可使用。
- 車身 4.63 × 1.78 × 1.435 m、軸距 2.70 m；前懸 0.935 m／後懸 0.995 m 使用同世代歐規官方尺寸圖作幾何參考。標準格 6 × 2.5 m；示範按實際車身外框、路緣及車格計算，詳見比例紀錄。
- 起點側向間距 40 cm；標準格先車尾對齊，再退約 67 cm 起轉。約 35° 回正直退，外側後輪到線才反打，最後停妥距路緣約 26 cm。這套起轉餘裕仍窄，窄格需多次修正，尚無示範。
- 俯視改正交投影，方便核對實際車／格比例；標線尺寸以中心計。
- 左、中、右三面後視鏡在駕駛座、斜俯視、正上方和跟車視角都保留。倒車鏡頭預設關閉，由左上按鈕手動開關，與 R 檔、視角及練習／測驗模式無關。
- E2E／unit test 繼續停用，只保留 build、步驟截圖與部署。

窗框、眼位及鏡面角度仍屬示意內裝，未經實車視線標定；示範按本車幾何規劃，不將影片觀察點當成每台車通用的固定觸發線。[來源、尺寸與本輪檢查](docs/tutorial-v09.md)。

## v0.8.1 踏板、回正與乾淨視野

- 所有檔位統一：**W／↑ 油門，S／↓／Space 煞車**；倒車選 R，再踩 W／↑。
- D／R 蠕行降為約 2.34／1.80 km/h，限制起步加速度及 jerk，避免未踩油門就快速起步。
- 方向盤任何角度放開後，由慢到快回正；靜止及倒車也適用，握住拖曳時維持轉角。
- 滑鼠拖曳或按住 J／L 轉頭，放開後平順回到前方。
- 移除雙手和中控停車圖；預設收起教練、滑桿、快捷提示及視角列，需要時點「顯示輔助」。
- 左右鏡放大為相同尺寸並水平對齊，中央鏡移至上方中央；保留點擊放大。
- 每向車道 3.25 m、兩側停車帶各 2.50 m，路面共 11.50 m；路面、標線、路緣及碰撞共用 ROAD 尺度。

[目前畫面與驗證紀錄](docs/driving-v081.md)。下方 v0.8.0 以前的說明為歷史版本紀錄；現行操作以上述規則為準。

## v0.8.0 車內視角與比例校正

- 第一人稱加入真正的 3D A 柱、車頂內襯、門板、儀表台、方向盤與雙手；轉頭時透視與遮擋會隨視角改變。
- 方向盤放大並保留拖曳；儀表顯示實際車速、檔位與前輪角度，中控顯示目前停車位置。
- 後照鏡改為較小的鏡框，保留點擊、Enter 放大與 Esc 縮小；桌機、手機直向和橫向分別配置按鈕。
- 車身長寬高 4.63 × 1.78 × 1.435 m、軸距 2.70 m；修正輪胎懸空及缺少輪拱造成的比例錯覺。
- 駕駛眼高設為離地 1.16 m、向下俯視 10°；鏡頭與車體共用公尺尺度，標準車格維持 6 × 2.5 m。

本輪以畫面與視野為主，沿用 v0.7 動力及轉向模型。外觀與內裝仍是風格化示意模型，座位高度也不是原廠內裝掃描值。[畫面、尺寸與驗證紀錄](docs/cockpit-v08.md)。

## v0.7.0 低速自排駕駛模型

- 油門起步平順，固定踩踏後線性加速；鬆油門會滑行至怠速蠕行，踩煞車才會停住。
- D 檔蠕行約 4.0 km/h、R 檔約 3.1 km/h；Space 煞車優先。停穩並持續踩煞車再切檔，避免換檔操作期間車子又開始蠕行。
- 方向盤左右各 1.5 圈，鍵盤／打滿／X 回正皆漸進轉動；行進時放手自動回正，倒車時輔助較弱，靜止保留角度。拖住輪圈可維持轉角。
- 4.63 × 1.78 m 房車、2.70 m 軸距；標準車位 6 × 2.5 m。車身、輪距、車格標線與碰撞共用公尺尺度，前輪以 Ackermann 幾何分別轉動。
- 桌機方向盤 280 px、側鏡約 389 × 239 px（1440 × 960）；手機方向盤 170 px。鏡面保留點擊放大、Enter／Esc 操作。
- 預設一般油門，前進上限 30 km/h、倒車上限 12 km/h；設定內仍可開啟 2.9 km/h 精細練習。先前儲存的設定會保留。

尺寸依官方規格；蠕行、加速度、方向盤圈數及回正是可調整的低速近似設定，未做實車量測校準。[模型與驗證紀錄](docs/physics-v07.md)。

## v0.6.0 大型鏡面與新場景

- 桌機預設左右鏡約 518 × 374 px（1440 × 960），較 v0.5 約 3.5 倍面積；點擊仍可再放大。
- 重建 WebGL 場景：圓弧車身、輪胎與輪框、窗框、街樹、鋪面紋理、日光與投影。
- 三輻方向盤可直接拖曳；左右各 1.5 圈對應前輪最大 35°，分開顯示輪圈圈數與前輪角度。鍵盤保留轉角，X 回正。
- 單一 WebGL context 與 GPU 鏡面合成；場景靜止時不持續重繪，移動時最多 25 fps。
- 手機可在練習設定切換視角。[本輪檢查與截圖](docs/v06-review.md)。

## v0.5.0 駕駛介面

- 放大方向盤控制、P / R / D、油門、煞車與儀表字體，桌機採整合控制台。
- 左右鏡面加大，三面鏡都可點擊放大，再點一次或 Esc 縮小。
- 排 R 後 **S / ↓ 可倒退**，Space 煞車；R 鍵直接選倒車，Backspace 重新練習。
- 練習採分項評分，未入位也能看到進度，前六次修正不扣分；測驗保留嚴格標準。
- 手機直向／橫向、筆電與大螢幕重新排版；專注駕駛可隱藏教練與數據。
- 完成 **11 輪截圖迭代**：[逐輪檢查紀錄與畫面](docs/ui-review.md)。

## 第一人稱是主角

- **預設駕駛座**：實際坐在左駕位置，觀察前車、路緣與車頭。
- **左右＋中央後視鏡**：三個獨立攝影機視點，隨車輛位置與轉角即時更新；測驗模式也能使用。
- **調整練習視野**：65° / 80° / 95°，可切換左右後視鏡的路緣觀察角度。
- **轉頭觀察**：拖曳擋風玻璃；J / L 按住看左／右，K 回到正前方，也提供觸控按鈕。
- **先看示範，再自己練**：示範保留第一人稱，可對照後視鏡與方向盤動作。
- 俯視與跟車視角保留作為理解幾何的輔助。

## 已實作

- Three.js WebGL renderer：共享街景與車輛模型，光影、材質與三面鏡在 GPU 合成。
- Rear-axle bicycle model，4.40 × 1.78 m 車身、2.64 m 軸距、最大 35° 等效前輪轉角、Ackermann 左右輪轉角。
- P / R / D、平順起步、線性加速、怠速蠕行、煞車優先、停穩才可換檔；方向鍵放開保留轉角，X 回正。
- 四種視角：斜俯視、正上方、跟車、駕駛座。
- 路邊停車／倒車入庫、三種車格、左右側停車、練習／測驗模式。
- 即時教練、倒車預測軌跡、路緣距離、角度、碰撞及前後修正計數。
- SAT 車身碰撞；練習允許 12 cm 標線餘裕及角度 < 12°，測驗嚴格四角入位及角度 < 8°；兩者均需停穩。
- 依位置、平行、路緣給分，另列碰撞與修正扣分；最近 50 次結果保存在 localStorage。
- 桌機及觸控操作；失去焦點與觸控取消時會放開踏板。

## 操作

| 操作 | 鍵盤 |
| --- | --- |
| 方向盤 | 拖曳輪圈或 ← → / A D；約 0.5 秒從置中打滿，放開保留轉角 |
| 打滿／回正 | Z 左打滿、X 回正、V 右打滿 |
| 油門 | ↑ / W |
| 煞車 | S / ↓ / Space，所有檔位一致 |
| R 檔倒退 | 選 R 檔後，W / ↑ 或油門踏板 |
| 前進／倒車 | 停穩後 Q 切換 D / R；F 前進、R 倒車、P 停車，或點畫面 P / R / D |
| 看左／右 | 按住 J / L，放開回正 |
| 看正前方 | K；或按畫面中的視線按鈕 |
| 自由轉頭 | 拖曳擋風玻璃，可往後側看；放開後平順回到前方 |
| 教學觀察 | 「教學／輔助」→ 按住「觀察參考點」 |
| 暫停示範 | 示範中點「暫停示範」，再點繼續 |
| 換視角 | C |
| 重新練習 | Backspace |
| 放大後視鏡 | 點鏡面或聚焦後 Enter；再點一次或 Esc 縮小 |
| 顯示／隱藏軌跡 | H |
| 提交／設定／說明 | E／G／? 或 F1 |
| 全靜音／音樂／雙黃燈 | M／N／Y |

主要練習請維持第一人稱，先觀察後視鏡，再慢慢操作。需要釐清車身旋轉方式時，可暫時切換俯視，再回到駕駛座。練習目標是車身四角在框內、與路緣平行、完全停穩。

## 本機執行

需要 Node.js 22+。Three.js r180 已隨專案附在 vendor/ 並保留 MIT License，不需 CDN 或 npm install 即可啟動；瀏覽器需支援 WebGL2。

```sh
npm start
# http://127.0.0.1:4173
npm run build # 產生 _site/，可交給任意靜態主機
```

目前為開發版，GitHub Actions 執行 build → 各步驟截圖 → 部署 GitHub Pages。E2E 與 unit test 暫停，等畫面與操作穩定後再啟用；既有測試檔案僅保留。截圖失敗不阻擋部署。Repository Settings → Pages → Source 設為 GitHub Actions。

手動產生同一組截圖（僅需在擷取畫面時安裝瀏覽器）：

```sh
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium
npm run build
npm run screenshots
# 輸出 _site/screenshots/：WebP、圖庫和 manifest.json
```

## 專案結構

| 檔案 | 責任 |
| --- | --- |
| physics.js | 純函式車輛模型、SAT 碰撞、場景與評分 |
| audio.js | 本地音效、音樂、音量偏好與接近提示 |
| shortcuts.js | 按鈕快捷鍵與說明 |
| lessons.js | 各關卡的四步教練與觀察點 |
| training.js | 以實際物理模擬規劃無碰撞的示範駕駛 |
| scene.js | 光影、材質、街道與車輛模型、靜態物件 Instancing |
| renderer.js | 共享 WebGL context、GPU 鏡面合成與四種攝影機 |
| steering.js | 輪圈指標拖曳與角度跨界處理 |
| game.js | 固定步長模擬、操作、教練、UI、成績紀錄 |
| tools/capture-steps.mjs | 獨立步驟截圖與 WebP 圖庫，不含測試斷言 |
| tests/ | 暫停使用的 Node.js 測試 |
| e2e/ | 暫停使用的 Playwright 測試 |

## 迭代清單

目前版本：**0.14.1**。教練提示依本場景調整、重新練習保留視角，碰撞接觸不會因持續踩油門而重複灌次數。

- [x] v0.1：路邊停車、四種視角、即時教練與評分。
- [x] 煞車優先、停穩換檔、左右側鏡像、接觸碰撞計數。
- [x] GitHub Actions build、步驟截圖與 Pages 部署；測試待穩定後再啟用。
- [x] 依實際模擬校準教練提示；接著持續收集實玩回饋。
- [x] 倒車鏡頭預設關閉，左上按鈕可隨時手動開關；所有視角保留三面後視鏡。
- [x] v0.3：獨立倒車鏡頭，發布資產採 content hash，避免更新後混用舊檔。
- [x] v0.4：第一人稱為預設；三面後視鏡、轉頭觀察、第一人稱主視覺。
- [x] v0.5：大按鈕、大鏡面、字體與控制台重設；R 檔 S / ↓ 倒退、寬容練習評分與 11 輪截圖迭代。
- [x] v0.6：預設大型鏡面、WebGL 場景重建、可拖曳三輻方向盤。
- [x] v0.7：線性加速、怠速蠕行、方向盤回正、實車尺寸與車格、方向盤放大及鏡面縮小。
- [x] v0.9：五段式觀察教學、回正直退、示範踏板與階段同步、比例俯視截圖。
- [ ] 用實車座位與照片標定窗框、眼位及鏡面視野。
- [ ] 不同車型與自訂軸距。
- [x] v0.2：低速練習、碰撞檢查的示範入位（寬鬆與標準車位），不計入個人成績。
- [ ] 個人練習軌跡重播與緊湊車位多次修正示範。
- [x] v0.11–0.14：友善比例、倒車入庫、音樂音效、快捷鍵與 3D 改善。
- [ ] 更多關卡：斜角車位、S 型練習。

## 範圍

玩法參考 [Parking Practice](https://parkingpractice.com/)，程式、介面與場景獨立實作，沒有複製原站素材或原始碼。這是低速自排動力與轉向幾何近似模型，未模擬輪胎滑移、完整懸吊、坡度、交通與駕駛觀察，不代表任何地區的官方考照標準。

程式碼採 MIT License。Three.js 版權聲明見 vendor/THREE-LICENSE.txt。

