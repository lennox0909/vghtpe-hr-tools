export const saveFile = async (blob, filename, description, acceptTypes) => {
    const fallbackDownload = () => {
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