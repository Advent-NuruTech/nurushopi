import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

/**
 * Upload image to Cloudinary
 * @param fileBuffer - File buffer (from FormData)
 * @param folder - Optional Cloudinary folder name
 */
export const uploadToCloudinary = async (fileBuffer: Buffer, folder = "nurushop") => {
  try {
    const base64 = fileBuffer.toString("base64");
    const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64}`, {
      folder,
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error("Failed to upload image");
  }
};

export default cloudinary;
