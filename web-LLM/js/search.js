class FaqSearcher {
    constructor() {
        this.worker = new Worker('./js/search-worker.js');
        this.isReady = false;
        this.resolvers = {};
        this.msgId = 0;
        
        this.worker.onmessage = (event) => {
            const { type, id, payload } = event.data;
            
            if (type === 'READY') {
                this.isReady = true;
                console.log("✅ Wasm 檢索引擎與內嵌 FAQ 資料已啟動");
            } else if (type === 'RESULT' || type === 'ERROR') {
                if (this.resolvers[id]) {
                    this.resolvers[id](payload);
                    delete this.resolvers[id];
                }
            }
        };
    }

    _dispatch(type, payload) {
        return new Promise((resolve) => {
            if (!this.isReady) {
                console.warn("⚠️ Wasm 引擎尚未準備好");
                resolve(type === 'SEARCH' ? { context: "", questions: [], isExactMatch: false } : null);
                return;
            }
            const id = ++this.msgId;
            this.resolvers[id] = resolve;
            this.worker.postMessage({ type, id, payload });
        });
    }

    async searchRelevantQA(userMessage, topK = 3) {
        return this._dispatch('SEARCH', { query: userMessage, topK });
    }

    async getExactFAQ(question) {
        return this._dispatch('EXACT', { query: question });
    }
}

const searchEngine = new FaqSearcher();

// 暴露 API 供 main.js 使用
export const initKnowledgeBase = () => { /* 邏輯已移至 Wasm 內部，保留空函式維持相容性 */ };
export const searchRelevantQA = async (q) => await searchEngine.searchRelevantQA(q);
export const getExactFAQ = async (q) => await searchEngine.getExactFAQ(q);