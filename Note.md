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

---
# GitHub Tag (標籤) 使用方式與時機指南

在 Git 與 GitHub 的工作流中，**Tag (標籤)** 就像是歷史紀錄中的「書籤」。它的主要作用是在一長串的 commit 歷史中，將某個特定的時間點（通常是重要版本）永久標記下來，方便未來隨時查找或回滾。

---

## 💡 使用時機 (When to use)

強烈建議在以下幾個關鍵節點使用 Tag：

1. **軟體版本發佈 (Release)**
   - 這是最常見的用途。當你的「北榮人事 AI 助理」開發完成一個階段並準備上線時，可以標記為 `v1.0.0`。
   - GitHub 的 "Releases" 功能也是基於 Tag 來運作的，有了 Tag 才能產生可供下載的發佈版本。

2. **階段性測試里程碑 (Milestone / Beta)**
   - 在正式上線前，若需要交付給其他部門進行測試，可以標記如 `v1.0.0-beta.1` 或 `v1.0.0-rc` (Release Candidate)。

3. **緊急錯誤修復 (Hotfix / Patch)**
   - 當正式環境發生 Bug 並完成緊急修復後，發佈一個小版本標籤，例如 `v1.0.1`，以利追蹤這次修復。

4. **重大架構重構前的快照 (Snapshot)**
   - 在進行極高風險的大幅度改版前（例如更換整個前端框架），可以打一個 `before-refactor` 的標籤，萬一重構失敗，可以迅速找回最穩定的狀態。

*(註：標籤命名通常遵循 [語意化版本 SemVer] 規範，即 `v主版號.次版號.修訂號`，例如 `v2.1.3`)*

---

## 🛠️ 使用方式 (How to use)

Git 的標籤分為兩種：「輕量標籤 (Lightweight)」與「附註標籤 (Annotated)」。**正式專案強烈建議使用「附註標籤」**，因為它會包含建立者、時間與註解說明。

### 1. 建立標籤
*   **建立附註標籤 (推薦)**：
    使用 `-a` 參數建立標籤，並用 `-m` 加上說明文字。
    ```bash
    git tag -a v1.0.0 -m "第一版人事 AI 助理正式上線，包含 WebGPU 模型下載與 FAQ 檢索功能"
    ```
*   **建立輕量標籤 (適合本地暫時使用)**：
    ```bash
    git tag v1.0.0-test
    ```
*   **針對過去的特定 commit 補打標籤**：
    如果你忘記打標籤，可以找到該次 commit 的 SHA 值 (前7碼即可) 補打。
    ```bash
    git tag -a v0.9.0 9fceb02 -m "補打測試版標籤"
    ```

### 2. 查看標籤
*   **列出所有標籤**：
    ```bash
    git tag
    ```
*   **查看特定標籤的詳細資訊與說明**：
    ```bash
    git show v1.0.0
    ```

### 3. 將標籤推送到 GitHub
**注意：預設情況下，`git push` 不會把標籤推送到遠端伺服器！** 你必須明確指示 Git 推送標籤。
*   **推送單一特定標籤**：
    ```bash
    git push origin v1.0.0
    ```
*   **一次推送本地所有的標籤**：
    ```bash
    git push origin --tags
    ```

### 4. 切換到特定標籤
如果你想回到 `v1.0.0` 時的程式碼狀態來查看：
```bash
git checkout v1.0.0
```

- (注意：這會讓你進入「分離指標 (detached HEAD)」狀態。若要在此基礎上修改程式碼，建議建立新分支：`git checkout -b fix-bug-branch v1.0.0`)

### 5. 刪除標籤
如果標籤打錯了，你需要分別在本地端與 GitHub 遠端進行刪除。

- 刪除本地標籤：
```bash
git tag -d v1.0.0
```

- 刪除 GitHub 上的遠端標籤：
```bash
git push --delete origin v1.0.0
```

# 專案環境設定與開發筆記

總而言之，在 `VS Code` 需開啟兩個 Terminal，一個跑 `node.js`，另一個跑 `ruby`。

- node.js
```bash
npx tailwindcss -i ./assets/css/input.css -o ./assets/css/style.css --watch
```

- ruby
```bash
# 啟動本地端 Jekyll 伺服器進行預覽

bundle exec jekyll serve

# Server address: http://127.0.0.1:4000/
```

- 

## 1. Tailwind CDN 改用 Tailwind 本地端編譯

為了提升網頁載入速度並避免樣式閃爍 (FOUC)，將 Tailwind 從 CDN 載入改為本地編譯流程：

*   **清理舊程式碼**：移除 HTML 檔案中的 `<script src="https://cdn.tailwindcss.com"></script>` 以及寫死在 HTML 內的 `<script> tailwind.config = { ... } </script>`。
*   **建立 `tailwind.config.js`**：
    透過 `npx tailwindcss init` 產生設定檔，設定 `content` 路徑以掃描專案內的 HTML/JS 檔案，並在此處統一定義自訂字體與主題色。
*   **設定輸入檔 `input.css`**：
    建立 Tailwind 的 CSS 進入點，包含三大核心指令：
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    /* 將所有全域的自訂 CSS (如 .glass-card) 寫在這裡 */
    ```
*   **注意版本差異**：因為 Tailwind v4 架構改變，建議指定安裝 v3 版本以確保與現有配置相容 (`npm install -D tailwindcss@3`)。

## 2. 在 VS Code 安裝 Jekyll (Windows 環境)

Jekyll 是基於 Ruby 的工具，並非 VS Code 擴充套件，需依序完成以下設定：

*   **安裝 Ruby**：前往官網下載並安裝 [RubyInstaller for Windows (含 Devkit)]。
*   **安裝編譯工具**：安裝過程中務必勾選 `MSYS2 development toolchain`，並在最後一步執行 `ridk install` 初始化設定。
*   **全域安裝 Jekyll**：重啟 VS Code 後，在終端機執行 `gem install jekyll bundler`。
*   **專案依賴安裝**：在專案根目錄確認有 `Gemfile` 後，執行 `bundle install`。

## 3. 常用 Bash 指令總結

**Node.js & Tailwind 相關：**
*   `npm init -y`：初始化 npm 專案 (產生 package.json)。
*   `npm install -D tailwindcss@3`：安裝 Tailwind CSS v3 作為開發依賴。
*   `npx tailwindcss init`：產生 `tailwind.config.js` 設定檔。
*   `npx tailwindcss -i ./assets/css/input.css -o ./assets/css/style.css --watch`：啟動 Tailwind 監聽編譯 (修改檔案時自動打包 CSS)。

**Ruby & Jekyll 相關：**
*   `gem install jekyll bundler`：全域安裝 Jekyll 與 Bundler 管理工具。
*   `bundle install`：依照 `Gemfile` 安裝專案所需的所有 Ruby 套件 (Gems)。
*   `bundle exec jekyll serve`：啟動本地端 Jekyll 伺服器進行預覽。

## 4. 其他重要注意事項

*   **自訂 CSS 撰寫原則**：
    **永遠不要**手動修改打包輸出的 `style.css` (會被自動覆蓋)。所有的自訂全域樣式必須寫在 `input.css` 裡面，透過 Tailwind CLI 進行合併與編譯。
*   **Git 忽略清單**：
    確保 `.gitignore` 檔案中包含 `node_modules/`，避免將龐大的 npm 套件推送到 GitHub。
*   **Gemfile 設定**：
    如果遇到缺件錯誤 (如 `Could not find 'minima'`)，請確認專案根目錄的 `Gemfile` 中有宣告必要的套件：
    ```ruby
    source "https://rubygems.org"
    gem "jekyll"
    gem "minima" # 預設佈景主題
    gem "webrick" # 新版 Ruby 可能需額外加入此伺服器套件
    ```
*   **雙終端機開發模式**：
    開發時，需在 VS Code 開啟兩個終端機分頁：一個執行 Tailwind 的 `--watch` 自動編譯，另一個執行 `jekyll serve` 架設伺服器。


# macOS 環境設定與開發筆記

## 在 VS Code 安裝 Jekyll (macOS 環境)

macOS 系統雖然內建 Ruby，但為了避免系統權限問題（例如常見的 `Gem::FilePermissionError`），強烈建議**不要**使用系統內建的 Ruby，而是透過 Homebrew 來安裝獨立的 Ruby 開發環境。請依照以下步驟在 VS Code 的終端機 (Terminal) 中進行設定：

### 1. 安裝 Homebrew (若尚未安裝)
Homebrew 是 macOS 必備的套件管理工具。若您的電腦還沒安裝，請在終端機貼上以下指令：
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. 透過 Homebrew 安裝 Ruby
使用 Homebrew 安裝最新版的 Ruby 開發環境：
```bash
brew install ruby
```
### 3. 設定環境變數 (非常重要)
為了讓系統優先使用 Homebrew 安裝的 Ruby，而不是 macOS 內建的舊版 Ruby，需要將其路徑加入環境變數。請在終端機執行以下指令（以 macOS 預設的 `zsh` 為例）：
```bash
# 針對 Apple Silicon (M1/M2/M3) 晶片的 Mac：
echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc

# 針對較舊的 Intel 晶片 Mac：
# echo 'export PATH="/usr/local/opt/ruby/bin:$PATH"' >> ~/.zshrc

# 重新載入設定檔讓變數立即生效：
source ~/.zshrc
```
### 4. 安裝 Jekyll 與 Bundler
確認 Ruby 環境切換成功後，即可全域安裝 Jekyll 與 Ruby 的套件管理工具 Bundler：
```bash
gem install jekyll bundler
```
### 5. 安裝專案套件並啟動
確認您的 VS Code 終端機目前位於專案的根目錄（也就是有 `Gemfile` 的資料夾），接著執行：
```bash
# 根據 Gemfile 安裝專案所需的所有套件
bundle install

# 啟動本地端 Jekyll 伺服器進行預覽
bundle exec jekyll serve
```