import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

export function uploadBufferToCloudinary(buffer, folder = "chrono_lux_products") {
    return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
            { folder, resource_type: "image" },
            (err, result) => {
                if (err) return reject(err);
                resolve(result.secure_url);
            }
        );
        streamifier.createReadStream(buffer).pipe(upload);
    });
}
