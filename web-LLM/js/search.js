// 負責載入與暫存 FAQ 資料
let faqDatabase = [];

export async function initKnowledgeBase(dataUrl) {
    try {
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error('FAQ 資料載入失敗');
        faqDatabase = await response.json();
        console.log(`✅ 成功載入 ${faqDatabase.length} 筆人事知識庫`);
    } catch (error) {
        console.error("❌ 知識庫載入錯誤:", error);
    }
}

// 模糊檢索演算法 (涵蓋 q, a, keywords, regulation, type)
export function searchRelevantQA(userMessage, topK = 3) {
    if (faqDatabase.length === 0) {
        console.warn("⚠️ 知識庫為空，無法進行檢索");
        return { context: "", questions: [], isExactMatch: false };
    }

    const rawQuery = userMessage.trim();
    const query = rawQuery.replace(/[?？!！,，.。~～\s]/g, '').toLowerCase();
    
    if (!query) return { context: "", questions: [], isExactMatch: false };

    let isExactMatch = false;

    const scoredQA = faqDatabase.map(item => {
        let score = 0;
        // 加入防呆機制，避免 JSON 欄位遺失導致程式崩潰
        const qStr = (item.q || "").toLowerCase();
        const aStr = (item.a || "").toLowerCase();
        const regStr = (item.regulation || "").toLowerCase(); 
        const typeStr = (item.type || "").toLowerCase(); // 【新增】讀取類別欄位
        const cleanQ = qStr.replace(/[?？!！,，.。~～\s]/g, '');
        
        // 1. 精準命中判斷 (代表使用者點選了按鈕)
        if (cleanQ === query || (item.q && item.q.trim() === rawQuery)) {
            score += 1000;
            isExactMatch = true;
        }

        // 2. 關鍵字 (keywords) 比對
        if (item.keywords && Array.isArray(item.keywords)) {
            item.keywords.forEach(keyword => {
                const kw = keyword.toLowerCase();
                if (query.includes(kw)) score += 20; 
                else if (kw.includes(query)) score += 10;
            });
        }

        // 3. 全文包含比對 (涵蓋 q, a, regulation, type)
        if (qStr.includes(query)) score += 15;
        if (query.includes(qStr)) score += 15;
        if (aStr.includes(query)) score += 10; 
        if (regStr.includes(query)) score += 10; 
        if (typeStr.includes(query)) score += 10; // 【新增】類別包含關鍵字

        // 4. Bigram 模糊比對容錯機制 (涵蓋 q, a, regulation, type)
        if (query.length >= 2) {
            for (let i = 0; i < query.length - 1; i++) {
                const bigram = query.substring(i, i + 2);
                if (qStr.includes(bigram)) score += 5; 
                if (aStr.includes(bigram)) score += 3; 
                if (regStr.includes(bigram)) score += 2; 
                if (typeStr.includes(bigram)) score += 2; // 【新增】類別模糊比對
            }
        } else if (query.length === 1) {
            if (qStr.includes(query)) score += 3;
            if (aStr.includes(query)) score += 2;
            if (regStr.includes(query)) score += 1;
            if (typeStr.includes(query)) score += 1; // 【新增】單字類別比對
        }

        return { ...item, score };
    });

    // 將過濾門檻設為 > 0，保留進候選池，再抓出前 3 名。
    const relevantResults = scoredQA
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    console.log(`🔍 搜尋：「${userMessage}」`);
    if (relevantResults.length === 0) {
        console.log("   -> ❌ 無命中新資料");
        return { context: "", questions: [], isExactMatch: false }; 
    }

    console.log("   -> ✅ 命中資料：");
    relevantResults.forEach((r, i) => console.log(`      [${i+1}] (分數:${r.score}) ${r.q}`));

    let context = "";
    let questions = []; 
    
    relevantResults.forEach((res, idx) => {
        // 【新增】將法規與類別資訊組合給 LLM
        const regInfo = res.regulation ? `\n法規依據：${res.regulation}` : "";
        const typeInfo = res.type ? `\n案件類別：${res.type}` : "";
        
        if (isExactMatch) {
            if (idx === 0) {
                context += `--- [精準命中資料] ---\n問：${res.q}\n答：${res.a}${typeInfo}${regInfo}\n\n`;
            } else {
                questions.push(res.q); 
            }
        } else {
            context += `--- [資料 ${idx + 1}] ---\n問：${res.q}\n答：${res.a}${typeInfo}${regInfo}\n\n`;
            questions.push(res.q);
        }
    });

    return { context, questions, isExactMatch }; 
}