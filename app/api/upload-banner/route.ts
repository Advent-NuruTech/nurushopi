import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface CloudinaryResponse {
  secure_url?: string;
  error?: { message?: string };
  [key: string]: unknown;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const title = formData.get("title")?.toString() || "";
    const link = formData.get("link")?.toString() || "";
    const shortDescription = formData.get("shortDescription")?.toString() || "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

    // Convert file to Blob
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

    const uploadRes: CloudinaryResponse = await uploadResponse.json();

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
  } catch (error: unknown) {
    console.error("Banner upload error:", error);

    const message =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
