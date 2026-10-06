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

## `git` 新版指令 

`git checkout` 與 `git switch` 最大的差異在於「職責是否單一」**與**「防呆安全性」。

在早期的 Git 中，`git checkout` 一人身兼兩份完全不同的工作：**「切換分支」**與**「還原檔案內容」**，這常讓開發者在分支名稱與資料夾名稱相同時誤操作，或是不小心把修改到一半的程式碼覆蓋掉。因此，Git 官方從 **2.23 版本**開始，將 `git checkout` 的兩大功能正式拆分成兩個語意明確的新指令：**`git switch`（專門管分支）** 與 **`git restore`（專門管檔案）**。

---

### 1. 指令對照與職責拆分表

| 操作目的 | 傳統萬用指令 (`git checkout`) | 現代專用指令 (`git switch` / `git restore`) | 說明 |
| --- | --- | --- | --- |
| **切換到既有分支** | `git checkout main` | `git switch main` | 單純切換分支，不會被誤判成還原名為 `main` 的檔案 |
| **建立並切換新分支** | `git checkout -b fix/diagram` | `git switch -c fix/diagram` | `-c` 代表 `--create`，語意比 `-b` 更直觀 |
| **切回上一個分支** | `git checkout -` | `git switch -` | 在兩個分支間快速來回切換 |
| **放棄單一檔案修改** | `git checkout -- index.html` | `git restore index.html` | 將檔案還原成最後一次 Commit 的狀態 |
| **從其他分支抽檔案** | `git checkout feat/LaTex -- diagram/` | `git restore -s feat/LaTex diagram/` | 不切換分支，只把指定分支的某個目錄/檔案抓過來 |

---

### 2. 為什麼推薦改用 `git switch`？（三大核心差異）

* **避免「分支與目錄同名」的歧義災難**：
在你的專案中，剛好曾經有一個叫做 `diagram` 的資料夾，如果你同時也建立了一個叫做 `diagram` 的分支，當你輸入 `git checkout diagram` 時，Git 與開發者很容易搞混：「你是要切換到 `diagram` 分支，還是要把 `diagram/` 資料夾的修改全部洗掉還原？」
而使用 `git switch diagram`，Git 百分之百只會去尋找名為 `diagram` 的分支，絕不會動到你的檔案。


* **預設具備「防 Detached HEAD（斷頭狀態）」保護**：
* 用 `git checkout <Commit_Hash>` 時，Git 會直接讓你跳到某個歷史 Commit 上（進入 Detached HEAD 狀態），在這個狀態下寫程式並 Commit，切回分支後很容易找不到剛剛寫的紀錄。
* 用 `git switch <Commit_Hash>` 時，Git 預設會**拒絕執行並報錯提醒**，除非你明確加上 `--detach` 參數（`git switch -d <Commit_Hash>`），安全性高很多。


* **與 `git restore` 完美分工**：
現在的標準心智模型非常乾淨：
* 只要想**動分支** 👉 一律用 **`git switch`**
* 只要想**救檔案** 👉 一律用 **`git restore`**



日常開發切換與建立分支時，全面使用 `git switch` 與 `git switch -c` 是目前最安全且現代化的做法；而 `git checkout` 依然完全保留向下相容，在舊腳本或跨分支抽取特定檔案時偶爾還是看得到它的身影。