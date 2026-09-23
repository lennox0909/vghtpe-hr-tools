document.addEventListener('DOMContentLoaded', () => {
    
    // --- CaD 與 DaC 視圖切換邏輯 ---
    const toggleButtons = document.querySelectorAll('.example-toggle-btn');
    const cadView = document.getElementById('view-cad');
    const dacView = document.getElementById('view-dac');
    const cadBtn = document.getElementById('btn-cad');
    const dacBtn = document.getElementById('btn-dac');

    const toggleExample = (type) => {
        if (type === 'cad') {
            cadView.classList.remove('hidden');
            setTimeout(() => cadView.classList.replace('opacity-0', 'opacity-100'), 10);
            dacView.classList.add('hidden');
            dacView.classList.replace('opacity-100', 'opacity-0');
            
            cadBtn.classList.add('active');
            dacBtn.classList.remove('active');
        } else {
            dacView.classList.remove('hidden');
            setTimeout(() => dacView.classList.replace('opacity-0', 'opacity-100'), 10);
            cadView.classList.add('hidden');
            cadView.classList.replace('opacity-100', 'opacity-0');
            
            dacBtn.classList.add('active');
            cadBtn.classList.remove('active');
        }
    };

    // 綁定切換按鈕事件
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const viewType = e.target.getAttribute('data-view');
            if (viewType) toggleExample(viewType);
        });
    });

    // --- 流程節點點擊捲動與高亮邏輯 ---
    const interactiveNodes = document.querySelectorAll('.interactive-node');
    
    const scrollToStep = (index) => {
        // 移除所有卡片的高亮狀態
        document.querySelectorAll('.flow-card').forEach(card => card.classList.remove('active'));
        
        // 尋找目標卡片並賦予高亮與捲動
        const target = document.getElementById(`step-${index}`);
        if (target) {
            target.classList.add('active');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // 綁定 SVG 互動節點事件
    interactiveNodes.forEach(node => {
        node.addEventListener('click', () => {
            const stepIndex = node.getAttribute('data-step');
            if (stepIndex !== null) scrollToStep(stepIndex);
        });
    });

});