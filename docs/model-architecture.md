# 車模與渲染架構

遊戲使用同一組公尺尺寸計算行駛、碰撞與車模。美術形狀可替換，碰撞仍由模擬層的車身輪廓決定。

| 模組 | 責任 |
| --- | --- |
| vehicle-spec.js | 車身尺寸、駕駛眼點、車艙範圍與模型節點名稱 |
| physics.js、courses.js、simulation.js | 低速車輛、碰撞、課程進度；不讀取 DOM 或 Three.js 場景 |
| assets/*.glb、model-assets.js | 靜態車內／車外資產、載入與規格檢查 |
| cockpit.js、vehicle-view.js | 將模擬狀態套用到方向盤、儀表、輪軸與車燈 |
| camera-rig.js | 各視角位置與投影；由呼叫端提供畫面邊界 |
| render-layout.js | DOM 尺寸、俯視安全區、可拖曳方向盤的位置 |
| renderer.js | 明確建立一個 RenderSystem，共用 WebGL context 與鏡面 render targets |
| scene.js | 依課程程序生成道路、車位、障礙物與軌跡 |
| game.js | 操作、示範、介面與固定時間步長的協調 |

## 每幀的順序

1. 遊戲以 120 Hz 固定步長推進模擬；輸入與物理行為沿用原本設定。
2. 有畫面變化且達到原本 40 ms 繪圖間隔時，呼叫 beginFrame。
3. 場景、車輛、儀表與陰影排程更新一次。
4. 左、中央、右鏡與需要時的倒車顯影共用該場景；各自設定相機與 render target。
5. 主視角繪圖，再以 GPU 合成鏡面。軌跡僅顯示於符合輔助設定的主視角。
6. endFrame 記錄繪圖統計；靜止且無變化時不持續提交 GPU 工作。

在瀏覽器 Console 讀取 window.parkingDiagnostics，可取得 frames、worldUpdates、views、calls、triangles 與 cpuFrameMs。cpuFrameMs 是 CPU 提交繪圖的時間，不能當成 GPU 執行時間或實測 FPS。

## 模型資源的所有權

車輛共用 GLB geometry；每台車擁有自己的車漆與動態車燈 material。移除障礙物只釋放該車私有的 material 與接地陰影 geometry，避免把其他車仍在使用的網格一起 dispose。

靜態車艙以相同材質合併網格；方向盤保留獨立 pivot，儀表和鏡面透過具名 anchor 接上。網格製作來源在 models/ 與 cabin-shell.js，建置使用與現有引擎相同的 Three.js r180 官方 GLTFExporter。

## 替換模型

1. 參考 assets/README.md，保留尺寸、座標、metadata 與必要節點。
2. 替換 assets/sedan-cabin.glb 或 assets/sedan-exterior.glb。
3. 執行 npm test、npm run build、npm run build:offline。
4. 需要目視確認時，執行 npm run screenshots，核對前、左、右、後四張圖。

若要使用程式化製作來源重新產生模型，先執行 npm run build:models。此指令會覆蓋兩個 GLB；直接修改 GLB 的美術工作流不需要執行它。

預設 CI 維持 unit tests 與建置。只有手動 visual_review 或 [visual-check] 提交才啟動瀏覽器，擷取四向畫面並驗證換視角、換課程、場景更新次數與離線 HTML 零外部請求。
