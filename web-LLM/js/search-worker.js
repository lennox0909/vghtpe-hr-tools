importScripts('./wasm_exec.js'); // 確保您已下載 Go 官方的 wasm_exec.js

const go = new Go();

WebAssembly.instantiateStreaming(fetch('./search.wasm'), go.importObject)
    .then((result) => {
        go.run(result.instance);
        postMessage({ type: 'READY' });
    })
    .catch((err) => {
        console.error("Wasm 載入失敗:", err);
    });

self.onmessage = function(event) {
    const { type, id, payload } = event.data;
    
    try {
        if (type === 'SEARCH') {
            const resultStr = self.goSearchRelevantQA(payload.query, payload.topK);
            postMessage({ type: 'RESULT', id, payload: JSON.parse(resultStr) });
        } else if (type === 'EXACT') {
            const resultStr = self.goGetExactFAQ(payload.query);
            postMessage({ type: 'RESULT', id, payload: JSON.parse(resultStr) });
        }
    } catch (err) {
        console.error("Wasm 運算錯誤:", err);
        postMessage({ type: 'ERROR', id, payload: null });
    }
};