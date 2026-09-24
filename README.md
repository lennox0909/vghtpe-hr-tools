<div align="center">

# 台北榮民總醫院 人事室工具箱
Feb 2026, `Leno` `Bing-Shi` `Tsai`



## 以 `Jekyll` 部屬，最佳化網頁`效能`與`管理`

</div>

### 使用 `yml` 設定檔輕鬆管理網頁
- 調整網頁元素與區塊
- 調整排列順序
- 調整`人事室 AI助理`可選用的模型
- 調整外部參考網頁URL



## 🎛️ 已建置工具：

1. [台北榮總人事室 AI助理](https://hrms.leno-1.com/web-LLM/)
1. [台北榮總人事室 圖表編輯器](https://hrms.leno-1.com/diagram/)
1. [台北榮總人事室 心智圖即時編輯器](https://hrms.leno-1.com/mindmap/)

    - `人事行政計算機`
        1. **建置 [API](https://github.com/lennox0909/taiwan-holidays/)。** *來源：[中華民國政府行政機關辦公日曆表](https://data.gov.tw/dataset/14718)*
        1. [台灣辦公日曆與計算機](https://hrms.leno-1.com/taiwan-holidays/)
        1. [臺北榮民總醫院人事室 PGY轉任住院醫師休假天數計算機)](https://hrms.leno-1.com/resident/)

## 🔧 Under the Hood

- by `SRP`、`CARP` and `DRY`

```text
.
├── index.html                  # Main Page (driven by `_data`)
│
├── _config.yml                 # Jekyll Setting (baseurl, title, url etc.)
├── .github/
│   └── workflows/
│       └── jekyll-gh-pages.yml # Script (Jekyll CI/CD pipeline with GH Pages)
│
├── assets/                     # 🌐 global static (`DRY`)
│   ├── css/
│   │   └── style.css           # global style (Tailwind, scroll, drag...)
│   └── js/
│       ├── app.js              # w/ Navbar & Main Page
│       └── shared/             # Shared JS Core
│           ├── file.js         # Shared IO (File System Access API etc.)
│           ├── resizer.js      # Touch Screnn Support
│           └── theme.js        # Dark/Light Swith
│
├── _data/                      # Data Layer
│   ├── links.yml               # External links
│   ├── status.yml              # System status
│   ├── tools.yml               # Tool Card Modal
│   └── workflows.yml           # Workflow Modal
│
├── _includes/                  # Module (`CARP`)
│   ├── hero.html               # Main Banner
│   ├── modal.html              # Contact Info
│   ├── navbar.html             # Top/Bottom Banner Module
│   ├── tool_card.html          # Tool Card Module (負責接收 tools.yml 的單筆資料)
│   └── workflow.html           # 單一工作流視圖 (負責接收 workflows.yml 的單筆資料)
│
└── _layouts/                   # 🖼️ 佈局層
    └── default.html            # 全站共用大外框 (定義 <head>、插入 Navbar、Footer 與共用 scripts)
```

