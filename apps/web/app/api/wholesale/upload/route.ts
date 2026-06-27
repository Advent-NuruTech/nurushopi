import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    /* ===============================
       IMAGE UPLOAD
       =============================== */
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file uploaded" },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = file.name.split(".").pop();
      const filename = `${randomUUID()}.${ext}`;

      const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "wholesale"
      );

      await mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, filename);
      await writeFile(filePath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/wholesale/${filename}`,
      });
    }

    /* ===============================
       PRODUCT CREATION
       =============================== */
    if (contentType.includes("application/json")) {
      const body = await req.json();

      const {
        name,
        price,
        wholesalePrice,
        wholesaleMinQty,
        wholesaleUnit,
        description,
        category,
        images,
        coverImage,
      } = body;

      if (!name || !wholesalePrice) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      const docRef = await addDoc(collection(db, "products"), {
        name,
        price,
        wholesalePrice,
        wholesaleMinQty,
        wholesaleUnit,
        description,
        category,
        images: images ?? [],
        coverImage: coverImage ?? null,
        mode: "wholesale",
        createdBy: admin.adminId,
        createdAt: serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        id: docRef.id,
      });
    }

    /* ===============================
       UNKNOWN TYPE
       =============================== */
    return NextResponse.json(
      { error: "Unsupported content type" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Wholesale upload error:", err);

    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
