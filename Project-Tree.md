# Project Tree
- `單一職責原則 (SRP)`、`合成/聚合複用原則 (CARP)` 以及 `DRY (不重複原則)`

```text
.
├── .gitignore                  # Git 忽略檔案設定
├── index.html                  # 系統首頁 (完全由 _data 資料驅動，不含硬編碼內容)
├── project_structure.txt       # tree 指令匯出的專案結構紀錄
├── README.md                   # 專案說明文件
├── _config.yml                 # Jekyll 全站設定檔 (包含 baseurl, title 等環境變數)
├── .github/
│   └── workflows/
│       └── jekyll-gh-pages.yml # GitHub Actions 部署腳本 (自動編譯 Jekyll 並發佈至 GH Pages)
├── assets/                     # 🌐 全域共用靜態資源 (落實 DRY 原則)
│   ├── css/
│   │   └── style.css           # 全域樣式表 (Tailwind 補充、共用捲軸、拖曳桿等跨模組樣式)
│   └── js/
│       ├── app.js              # 首頁與 Navbar 的基礎互動腳本
│       └── shared/             # 💡 跨工具共用的 JS 模組核心庫
│           ├── file.js         # 統一的檔案存取與下載邏輯 (File System Access API & 降級方案)
│           ├── resizer.js      # 統一的雙欄面板拖曳調整邏輯 (支援滑鼠與觸控)
│           └── theme.js        # 統一的深淺色模式 (Dark/Light) 切換邏輯
├── diagram/                    # 🛠️ 子系統一：流程圖編輯器 (Markdown + Mermaid)
│   ├── index.html              # 編輯器主視圖 (自動繼承 _layouts/default.html)
│   ├── sample.md               # 預設載入的 20 種 Mermaid 範例檔
│   ├── css/
│   │   ├── animations.css      # 工具專屬過渡動畫
│   │   └── mermaid-fixes.css   # 修復 Mermaid SVG 溢出與標籤顯示問題
│   └── js/                     # 🧩 依 SRP 拆分的流程圖腳本
│       ├── config.js           # DOM 節點與常數統一管理
│       ├── file-io.js          # 處理檔案匯入匯出 (引用 shared/file.js)
│       ├── image-export.js     # 處理 SVG 轉 PNG 的畫布重繪與匯出
│       ├── layout.js           # 處理 UI 佈局與編輯器隱藏 (引用 shared/resizer.js)
│       ├── main.js             # 流程圖系統進入點 (綁定事件與初始化)
│       ├── renderer.js         # Mermaid 核心渲染引擎與工具列生成
│       ├── tailwind.config.js  # 此頁面專屬的 Tailwind 配置
│       ├── theme.js            # 工具專屬主題設定
│       └── utils.js            # 工具專屬的 Toast 提示與 Modal 互動
├── mindmap/                    # 🛠️ 子系統二：心智圖編輯器 (Markmap)
│   ├── index.html              # 編輯器主視圖 (自動繼承 _layouts/default.html)
│   ├── sample.txt              # 預設心智圖範例 (副檔名用 .txt 避免 Jekyll 轉譯成 HTML)
│   ├── Taipei_Veterans_General_Hospital_Emblem.svg
│   ├── css/
│   │   ├── editor.css          # CodeMirror 編輯區樣式與行號設定
│   │   └── mindmap-core.css    # Markmap SVG 繪圖層互動樣式
│   └── js/                     # 🧩 依 SRP 拆分的心智圖腳本
│       ├── config.js           # DOM 節點與儲存 Key 統一管理
│       ├── file-io.js          # 處理 HTML/MD/SVG 匯出 (引用 shared/file.js)
│       ├── layout.js           # 處理字體縮放與面板互動 (引用 shared/resizer.js)
│       ├── main.js             # 心智圖系統進入點 (非同步 fetch 與 CodeMirror 綁定)
│       ├── modal.js            # 工具專屬自訂彈窗邏輯
│       └── renderer.js         # Markmap 核心渲染與 D3.js 縮放/平移控制
├── _data/                      # 📦 資料層 (實現資料與視圖分離)
│   ├── links.yml               # 導覽列或頁尾的外部連結清單
│   ├── status.yml              # 首頁核心工具列的「系統狀態」與「更新日期」
│   ├── tools.yml               # 首頁工具卡片 (如流程圖、心智圖) 的標題與描述
│   └── workflows.yml           # 首頁動態渲染的「工作流」步驟區塊
├── _includes/                  # 🧩 組件層 (實現 CARP 組合複用)
│   ├── hero.html               # 首頁頂部歡迎橫幅組件
│   ├── modal.html              # 全站共用的「聯絡資訊」彈窗組件
│   ├── navbar.html             # 全站共用的頂部導覽列
│   ├── tool_card.html          # 單一工具卡片視圖 (負責接收 tools.yml 的單筆資料)
│   └── workflow.html           # 單一工作流視圖 (負責接收 workflows.yml 的單筆資料)
└── _layouts/                   # 🖼️ 佈局層
    └── default.html            # 全站共用大外框 (定義 <head>、插入 Navbar、Footer 與共用 scripts)
```

## PowerShell 一次性建立重構後的所有資料夾與空白檔案

```PowerShell
# 1. 建立所有資料夾
mkdir _data, _layouts, _includes, assets\css, assets\js

# 2. 建立根目錄檔案
ni _config.yml, index.html -ItemType File

# 3. 建立資料層檔案
ni _data\tools.yml, _data\links.yml -ItemType File

# 4. 建立佈局與組件檔案
ni _layouts\default.html -ItemType File
ni _includes\navbar.html, _includes\hero.html, _includes\tool_card.html, _includes\workflow.html, _includes\modal.html -ItemType File

# 5. 建立靜態資源檔案
ni assets\css\style.css, assets\js\app.js -ItemType File

# 6. 建立`.gitignore`
ni .gitignore -ItemType File

# 顯示當前目錄下包含檔案的完整樹狀圖
tree /F

# 將專案結構匯出成純文字檔（使用 /A 確保符號在任何編輯器中都不會亂碼）
tree /F /A > project_structure.txt

```