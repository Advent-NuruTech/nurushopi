import { NextResponse } from "next/server";

// --- Validate environment variables ---
if (
  !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  !process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
) {
  throw new Error("❌ Missing Cloudinary unsigned upload environment variables");
}

// --- Define expected Cloudinary response type ---
interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  error?: { message: string };
}

// --- POST handler for unsigned uploads ---
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No valid file uploaded" },
        { status: 400 }
      );
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

    // Prepare upload form
    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("upload_preset", uploadPreset);
    uploadData.append("folder", "nurushop/products");

    // --- Upload directly to Cloudinary (unsigned) ---
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: uploadData,
      }
    );

    const data: CloudinaryUploadResponse = await response.json();

    if (!response.ok) {
      console.error("❌ Cloudinary upload failed:", data);
      return NextResponse.json(
        { error: data.error?.message || "Upload failed" },
        { status: 500 }
      );
    }

    // ✅ Success
    return NextResponse.json({
      success: true,
      url: data.secure_url,
      public_id: data.public_id,
      format: data.format,
      width: data.width,
      height: data.height,
      bytes: data.bytes,
    });
  } catch (error) {
    console.error("❌ Upload Error:", error);
    const message =
      error instanceof Error ? error.message : "Unexpected upload error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// --- Optional: prevent caching and force server runtime ---
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
