import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const videosDir = path.join(__dirname, '../public/videos');

async function uploadVideos() {
    try {
        if (!fs.existsSync(videosDir)) {
            console.error('Videos directory not found:', videosDir);
            return;
        }

        const files = fs.readdirSync(videosDir);
        const videoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
        });

        console.log(`Found ${videoFiles.length} videos to upload.`);

        const uploadResults = {};

        for (const file of videoFiles) {
            const filePath = path.join(videosDir, file);
            console.log(`Uploading ${file}...`);

            try {
                const result = await cloudinary.uploader.upload(filePath, {
                    resource_type: 'video',
                    folder: 'chrono-lux/videos',
                    public_id: path.parse(file).name
                });

                console.log(`Successfully uploaded ${file}: ${result.secure_url}`);
                uploadResults[file] = result.secure_url;
            } catch (error) {
                console.error(`Failed to upload ${file}:`, error.message);
            }
        }

        console.log('\nAll uploads completed!');
        console.log('Summary of video URLs:');
        console.log(JSON.stringify(uploadResults, null, 2));

        // Save results to a JSON file for future reference
        const resultsPath = path.join(__dirname, '../video_urls.json');
        fs.writeFileSync(resultsPath, JSON.stringify(uploadResults, null, 2));
        console.log(`\nURLs saved to ${resultsPath}`);

    } catch (error) {
        console.error('Error during upload process:', error);
    }
}

uploadVideos();
