import fs from 'fs';
import path from 'path';
import https from 'https';

/**
 * Downloads an image from a URL (handling Google redirects) 
 * and saves it to public/uploads/locations.
 * Returns the public URL path (e.g., /uploads/locations/loc_123.jpg).
 */
export async function downloadAndSaveImage(url: string, googleId: string): Promise<string | null> {
    if (!url || !url.includes('googleapis')) return url; // Already local or invalid

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'locations');

    // Ensure dir exists
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `loc_${googleId}.jpg`;
    const filepath = path.join(uploadDir, filename);
    const publicPath = `/uploads/locations/${filename}`;

    // If file already exists, return it (simple cache check)
    if (fs.existsSync(filepath)) {
        return publicPath;
    }

    try {
        await new Promise((resolve, reject) => {
            const download = (dUrl: string) => {
                https.get(dUrl, (res) => {
                    // Handle Redirects (301, 302)
                    if (res.statusCode === 301 || res.statusCode === 302) {
                        if (res.headers.location) {
                            download(res.headers.location);
                            return;
                        }
                        reject(new Error('Redirect without location'));
                        return;
                    }

                    if (res.statusCode === 200) {
                        const stream = fs.createWriteStream(filepath);
                        res.pipe(stream);
                        stream.on('finish', () => {
                            stream.close();
                            resolve(true);
                        });
                        stream.on('error', (err) => {
                            fs.unlink(filepath, () => { }); // Clean up partial file
                            reject(err);
                        });
                    } else {
                        reject(new Error(`Status: ${res.statusCode}`));
                    }
                }).on('error', (err) => reject(err));
            };
            download(url);
        });

        return publicPath;
    } catch (error) {
        console.error("Image Download Failed:", error);
        return null;
    }
}
