# Project Tree

```text
.
├── _config.yml              # Jekyll 全域設定
├── _data/                   # [SRP] 資料層：分離硬編碼的內容
│   ├── tools.yml            # 獨立管理「核心工具列」的各項工具資訊
│   └── links.yml            # 獨立管理導覽列的「更多資訊」連結
├── _layouts/
│   └── default.html         # [CARP] 佈局層：將通用 HTML 骨架與 <head> 抽離
├── _includes/               # [CARP] 視圖組件層：以組合取代龐大單一檔案
│   ├── navbar.html          # 將原本 top_banner.js 內的 HTML 轉為伺服器端組件
│   ├── hero.html            # 獨立的 Hero 區塊
│   ├── tool_card.html       # 單一工具卡片的模板
│   ├── workflow.html        # 系統重構工作流區塊
│   └── modal.html           # 獨立的聯絡資訊彈窗組件
├── assets/
│   ├── css/
│   │   └── style.css        # 樣式表
│   └── js/
│       └── app.js           # [SRP] 行為層：統整與重構前端互動邏輯，消除全域變數
└── index.html               # 首頁進入點：純粹負責「組合」各組件與注入資料
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

```