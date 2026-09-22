import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

export async function initEngine(modelName, progressCallback) {
    if (!navigator.gpu) throw new Error("需要 WebGPU 支援才能執行模型！");
    return await CreateMLCEngine(modelName, { initProgressCallback: progressCallback });
}