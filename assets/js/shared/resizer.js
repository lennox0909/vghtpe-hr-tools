export const initResizer = (resizerEl, targetPaneEl, containerEl, onResizeEnd = () => {}) => {
    let isResizing = false;

    const resizePanel = (e) => {
        if (!isResizing) return;
        if (e.type === 'touchmove') e.preventDefault();
        
        const isDesktop = window.innerWidth >= 768;
        const containerRect = containerEl.getBoundingClientRect();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        if (isDesktop) {
            let newWidth = ((clientX - containerRect.left) / containerRect.width) * 100;
            targetPaneEl.style.width = `${Math.max(10, Math.min(newWidth, 90))}%`;
            targetPaneEl.style.height = '100%';
        } else {
            let newHeight = ((clientY - containerRect.top) / containerRect.height) * 100;
            targetPaneEl.style.height = `${Math.max(10, Math.min(newHeight, 90))}%`;
            targetPaneEl.style.width = '100%';
        }
    };

    const stopResize = () => {
        isResizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', resizePanel);
        document.removeEventListener('touchmove', resizePanel);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchend', stopResize);
        setTimeout(onResizeEnd, 50);
    };

    const startResize = () => {
        isResizing = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = window.innerWidth >= 768 ? 'col-resize' : 'row-resize';
        document.addEventListener('mousemove', resizePanel);
        document.addEventListener('touchmove', resizePanel, { passive: false });
        document.addEventListener('mouseup', stopResize);
        document.addEventListener('touchend', stopResize);
    };

    resizerEl.addEventListener('mousedown', startResize);
    resizerEl.addEventListener('touchstart', startResize, { passive: false });
};