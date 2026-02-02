import cloudinary from "../../config/cloudinary.js";

export const uploadProfileImageToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "chrono-luxe/profile",
        resource_type: "image",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    ).end(buffer);
  });
};