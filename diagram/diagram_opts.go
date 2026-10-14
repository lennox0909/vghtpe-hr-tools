package main

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"syscall/js"
)

var (
	// (?s) 代表讓 . 可以匹配換行符號
	codeBlockRegex  = regexp.MustCompile("(?s)```([^\\r\\n]*)\\r?\\n(.*?)```")
	inlineCodeRegex = regexp.MustCompile("`([^`\\r\\n]+)`")
	blockMathRegex  = regexp.MustCompile(`(?s)\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]`)
	// Go 原生不支援負向後行斷言 (?<!...)，因此使用擷取群組來判斷前綴
	inlineMathRegex = regexp.MustCompile(`(?s)(^|[^\\])\$([^\$\r\n]+?)\$|\\\(([\s\S]+?)\\\)`)
	boldRegex       = regexp.MustCompile(`\*\*([^\*\r\n]+?)\*\*`)

	// Mermaid SVG 修正專用的正則表達式
	foreignObjectRegex = regexp.MustCompile(`(?i)<foreignObject[^>]*class="[^"]*cluster-label[^"]*"[^>]*>`)
	widthRegex         = regexp.MustCompile(`(?i)width="([0-9.]+)"`)
	xRegex             = regexp.MustCompile(`(?i)x="([0-9.\-]+)"`)
)

func preprocessLatexInMarkdown(this js.Value, args []js.Value) any {
	if len(args) == 0 {
		return ""
	}
	text := args[0].String()

	// 1. 預先過濾不可見字元
	text = strings.ReplaceAll(text, "\u00A0", " ")
	text = strings.ReplaceAll(text, "\u2028", "<br/>")
	text = strings.ReplaceAll(text, "\u2029", "<br/>")

	mathStore := []map[string]string{}
	inlineCodeStore := []string{}
	codeBlockStore := []string{}

	// 2. 處理多行程式碼與區塊公式 (```math)
	text = codeBlockRegex.ReplaceAllStringFunc(text, func(match string) string {
		subs := codeBlockRegex.FindStringSubmatch(match)
		lang := strings.ToLower(strings.TrimSpace(subs[1]))
		content := strings.TrimSpace(subs[2])

		if lang == "math" || lang == "latex" {
			id := fmt.Sprintf("MATHTOKEN%dEND", len(mathStore))
			mathStore = append(mathStore, map[string]string{"type": "block", "expr": content, "raw": match})
			return id
		}
		id := fmt.Sprintf("CODEBLOCK%dEND", len(codeBlockStore))
		codeBlockStore = append(codeBlockStore, match)
		return id
	})

	// 3. 處理行內程式碼
	text = inlineCodeRegex.ReplaceAllStringFunc(text, func(match string) string {
		subs := inlineCodeRegex.FindStringSubmatch(match)
		content := subs[1]
		id := fmt.Sprintf("INLINECODE%dEND", len(inlineCodeStore))
		escaped := strings.ReplaceAll(content, "&", "&amp;")
		escaped = strings.ReplaceAll(escaped, "<", "&lt;")
		escaped = strings.ReplaceAll(escaped, ">", "&gt;")

		html := fmt.Sprintf(`<code class="px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono text-[0.875em] font-semibold before:content-none after:content-none">%s</code>`, escaped)
		inlineCodeStore = append(inlineCodeStore, html)
		return id
	})

	// 4. 處理獨立區塊公式 ($$ 或 \[)
	text = blockMathRegex.ReplaceAllStringFunc(text, func(match string) string {
		subs := blockMathRegex.FindStringSubmatch(match)
		expr := strings.TrimSpace(subs[1])
		if expr == "" {
			expr = strings.TrimSpace(subs[2])
		}
		id := fmt.Sprintf("MATHTOKEN%dEND", len(mathStore))
		mathStore = append(mathStore, map[string]string{"type": "block", "expr": expr, "raw": match})
		return id
	})

	// 5. 處理行內公式 ($ 或 \()
	text = inlineMathRegex.ReplaceAllStringFunc(text, func(match string) string {
		subs := inlineMathRegex.FindStringSubmatch(match)
		prefix := subs[1]
		expr := strings.TrimSpace(subs[2])
		if expr == "" {
			expr = strings.TrimSpace(subs[3])
			prefix = ""
		}
		id := fmt.Sprintf("MATHTOKEN%dEND", len(mathStore))
		mathStore = append(mathStore, map[string]string{"type": "inline", "expr": expr, "raw": strings.TrimPrefix(match, prefix)})
		return prefix + id
	})

	// 6. 處理粗體 (需確保根目錄 tailwind.config.js 的 content 有掃描 ./**/*.go)
	text = boldRegex.ReplaceAllString(text, `<strong class="font-bold text-slate-900 dark:text-white">$1</strong>`)

	// 7. 還原多行程式碼區塊
	for i, cb := range codeBlockStore {
		text = strings.ReplaceAll(text, fmt.Sprintf("CODEBLOCK%dEND", i), cb)
	}

	resultMap := map[string]any{
		"processedText":   text,
		"mathStore":       mathStore,
		"inlineCodeStore": inlineCodeStore,
	}
	resultBytes, _ := json.Marshal(resultMap)
	return string(resultBytes)
}

func fixMermaidSubgraphsSVG(this js.Value, args []js.Value) any {
	if len(args) == 0 {
		return ""
	}
	svg := args[0].String()

	// 1. 修正 foreignObject 的寬度與 x 軸 (解決標題截斷)
	svg = foreignObjectRegex.ReplaceAllStringFunc(svg, func(match string) string {
		newMatch := widthRegex.ReplaceAllStringFunc(match, func(wMatch string) string {
			subs := widthRegex.FindStringSubmatch(wMatch)
			if val, err := strconv.ParseFloat(subs[1], 64); err == nil {
				return fmt.Sprintf(`width="%f"`, val+80)
			}
			return wMatch
		})
		newMatch = xRegex.ReplaceAllStringFunc(newMatch, func(xMatch string) string {
			subs := xRegex.FindStringSubmatch(xMatch)
			if val, err := strconv.ParseFloat(subs[1], 64); err == nil {
				return fmt.Sprintf(`x="%f"`, val-40)
			}
			return xMatch
		})

		if strings.Contains(newMatch, "style=") {
			newMatch = strings.Replace(newMatch, `style="`, `style="overflow: visible; white-space: nowrap; `, 1)
		} else {
			newMatch = strings.TrimSuffix(newMatch, ">") + ` style="overflow: visible; white-space: nowrap;">`
		}
		return newMatch
	})

	// 2. 注入精準的 CSS：只針對有自訂 fill 背景的 cluster 強制轉為深色字，絕不影響一般節點！
	cssInjection := `<style>
		g.cluster > rect, g.cluster > path { display: block !important; }
		g.cluster:has(> rect[style*="fill:"]), g.cluster:has(> path[style*="fill:"]),
		g.cluster:has(> rect[fill]:not([fill="none"])), g.cluster:has(> path[fill]:not([fill="none"])) {
			--subgraph-text: #0f172a;
		}
		g.cluster[style*="fill:"] .cluster-label *,
		g.cluster:has(> rect[style*="fill:"]) .cluster-label *,
		g.cluster:has(> path[style*="fill:"]) .cluster-label *,
		g.cluster:has(> rect[fill]:not([fill="none"])) .cluster-label * {
			color: #0f172a !important;
			fill: #0f172a !important;
			font-weight: 700 !important;
		}
	</style>`

	svgStartIdx := strings.Index(svg, ">")
	if svgStartIdx != -1 && strings.HasPrefix(strings.TrimSpace(svg), "<svg") {
		svg = svg[:svgStartIdx+1] + cssInjection + svg[svgStartIdx+1:]
	}

	return svg
}

func main() {
	c := make(chan struct{})
	js.Global().Set("goPreprocessLatex", js.FuncOf(preprocessLatexInMarkdown))
	js.Global().Set("goFixMermaidSubgraphs", js.FuncOf(fixMermaidSubgraphsSVG))
	<-c
}