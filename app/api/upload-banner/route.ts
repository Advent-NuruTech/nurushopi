import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const link = formData.get("link") as string;
    const shortDescription = formData.get("shortDescription") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const blob = new Blob([bytes]);

    // Upload directly to Cloudinary unsigned endpoint
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const uploadData = new FormData();
    uploadData.append("file", blob);
    uploadData.append("upload_preset", uploadPreset);
    uploadData.append("folder", "nurushop_banners");

    const uploadResponse = await fetch(cloudinaryUrl, {
      method: "POST",
      body: uploadData,
    });

    const uploadRes = await uploadResponse.json();

    if (!uploadRes.secure_url) {
      throw new Error(uploadRes.error?.message || "Upload failed");
    }

    // Save metadata to Firestore
    await addDoc(collection(db, "banners"), {
      title,
      shortDescription,
      link,
      image: uploadRes.secure_url,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ message: "Banner uploaded successfully ✅" });
  } catch (error: any) {
    console.error("Banner upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
