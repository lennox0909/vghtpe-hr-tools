export const saveFile = async (blobOrBuilder, filename, description, acceptTypes) => {
    const getBaseTitle = (name) => name.replace(/\.[^/.]+$/, '');

    const resolveBlob = (finalFilename) => {
        if (typeof blobOrBuilder === 'function') {
            const result = blobOrBuilder(finalFilename, getBaseTitle(finalFilename));
            return result instanceof Blob
                ? result
                : new Blob([result], { type: 'text/html;charset=utf-8' });
        }
        return blobOrBuilder;
    };

    const fallbackDownload = () => {
        const blob = resolveBlob(filename);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    try {
        if ('showSaveFilePicker' in window) {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{ description, accept: acceptTypes }]
            });
            // 取得使用者在存檔對話框中實際輸入的檔名 (例如: "專案架構.html")
            const actualFilename = handle.name || filename;
            const blob = resolveBlob(actualFilename);
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } else {
            fallbackDownload();
        }
    } catch (err) {
        if (err.name !== 'AbortError') fallbackDownload();
    }
};