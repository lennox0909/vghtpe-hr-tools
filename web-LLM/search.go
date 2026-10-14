package main

import (
	_ "embed"  // 👈 這裡加入底線與空白
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"syscall/js"
)

//go:embed data/faq.json
var faqJSON []byte

type FAQ struct {
	ID         int      `json:"id"`
	Type       string   `json:"type"`
	Q          string   `json:"q"`
	A          string   `json:"a"`
	Regulation string   `json:"regulation"`
	Keywords   []string `json:"keywords"`
}

type ScoredFAQ struct {
	FAQ
	Score int
}

var faqList []FAQ
var punctuationRegex = regexp.MustCompile(`[?？!！,，.。~～\s]`)

func init() {
	if err := json.Unmarshal(faqJSON, &faqList); err != nil {
		fmt.Println("FAQ JSON 解析失敗:", err)
	}
}

// 提供給前端：精準抓取對應的 QA 資料
func getExactFAQ(this js.Value, args []js.Value) any {
	if len(args) == 0 {
		return "null"
	}
	query := args[0].String()

	for _, item := range faqList {
		if item.Q == query {
			resultBytes, _ := json.Marshal(item)
			return string(resultBytes)
		}
	}
	return "null"
}

// 提供給前端：混合模糊檢索演算法
func searchRelevantQA(this js.Value, args []js.Value) any {
	if len(args) < 2 {
		return `{"context": "", "questions": [], "isExactMatch": false}`
	}
	rawQuery := strings.TrimSpace(args[0].String())
	topK := args[1].Int()

	query := strings.ToLower(punctuationRegex.ReplaceAllString(rawQuery, ""))
	if query == "" {
		return `{"context": "", "questions": [], "isExactMatch": false}`
	}

	queryRunes := []rune(query)
	isExactMatch := false
	var scoredList []ScoredFAQ

	for _, item := range faqList {
		score := 0
		qStr := strings.ToLower(item.Q)
		aStr := strings.ToLower(item.A)
		regStr := strings.ToLower(item.Regulation)
		typeStr := strings.ToLower(item.Type)
		cleanQ := punctuationRegex.ReplaceAllString(qStr, "")

		// 1. 精準命中判斷
		if cleanQ == query || strings.TrimSpace(item.Q) == rawQuery {
			score += 1000
			isExactMatch = true
		}

		// 2. 關鍵字比對
		for _, kw := range item.Keywords {
			kwLower := strings.ToLower(kw)
			if strings.Contains(query, kwLower) {
				score += 20
			} else if strings.Contains(kwLower, query) {
				score += 10
			}
		}

		// 3. 全文包含比對
		if strings.Contains(qStr, query) || strings.Contains(query, qStr) {
			score += 15
		}
		if strings.Contains(aStr, query) {
			score += 10
		}
		if strings.Contains(regStr, query) {
			score += 20
		}
		if strings.Contains(typeStr, query) {
			score += 10
		}

		// 4. Bigram 模糊比對容錯機制
		if len(queryRunes) >= 2 {
			for i := 0; i < len(queryRunes)-1; i++ {
				bigram := string(queryRunes[i : i+2])
				if strings.Contains(qStr, bigram) {
					score += 5
				}
				if strings.Contains(aStr, bigram) {
					score += 3
				}
				if strings.Contains(regStr, bigram) {
					score += 2
				}
				if strings.Contains(typeStr, bigram) {
					score += 2
				}
			}
		} else if len(queryRunes) == 1 {
			if strings.Contains(qStr, query) {
				score += 3
			}
			if strings.Contains(aStr, query) {
				score += 2
			}
			if strings.Contains(regStr, query) {
				score += 1
			}
			if strings.Contains(typeStr, query) {
				score += 1
			}
		}

		if score > 0 {
			scoredList = append(scoredList, ScoredFAQ{FAQ: item, Score: score})
		}
	}

	// 排序並取 Top K
	sort.SliceStable(scoredList, func(i, j int) bool {
		return scoredList[i].Score > scoredList[j].Score
	})
	if len(scoredList) > topK {
		scoredList = scoredList[:topK]
	}

	if len(scoredList) == 0 {
		return `{"context": "", "questions": [], "isExactMatch": false}`
	}

	// 組合回傳資料
	var context strings.Builder
	var questions []string

	for idx, res := range scoredList {
		regInfo := ""
		if res.Regulation != "" {
			regInfo = fmt.Sprintf("\n法規依據：%s", res.Regulation)
		}
		typeInfo := ""
		if res.Type != "" {
			typeInfo = fmt.Sprintf("\n案件類別：%s", res.Type)
		}

		if isExactMatch {
			if idx == 0 {
				context.WriteString(fmt.Sprintf("--- [精準命中資料] ---\n問：%s\n答：%s%s%s\n\n", res.Q, res.A, typeInfo, regInfo))
			} else {
				questions = append(questions, res.Q)
			}
		} else {
			context.WriteString(fmt.Sprintf("--- [資料 %d] ---\n問：%s\n答：%s%s%s\n\n", idx+1, res.Q, res.A, typeInfo, regInfo))
			questions = append(questions, res.Q)
		}
	}

	resultMap := map[string]any{
		"context":      context.String(),
		"questions":    questions,
		"isExactMatch": isExactMatch,
	}
	resultBytes, _ := json.Marshal(resultMap)

	return string(resultBytes)
}

func main() {
	c := make(chan struct{})
	js.Global().Set("goSearchRelevantQA", js.FuncOf(searchRelevantQA))
	js.Global().Set("goGetExactFAQ", js.FuncOf(getExactFAQ))
	<-c
}