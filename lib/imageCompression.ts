
interface CompressOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0 to 1
}

/**
 * Resizes and compresses an image file in the browser.
 * Returns a Promise that resolves to a Base64 string.
 */
export function compressImage(file: File, options: CompressOptions = {}): Promise<string> {
    const { maxWidth = 1024, maxHeight = 1024, quality = 0.8 } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Compress
                // 'image/jpeg' usually gives better compression than png for photos
                // If transparency is needed, we might need to check file type, but user mostly asked for photos.
                // Profile pics and DM photos generally don't strictly need transparency.
                // However, safe bet is usually matching input or defaulting to jpeg for size.
                // Let's default to jpeg for maximum compression as requested ("db yer kaplamasın").
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
