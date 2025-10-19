// /app/api/banners/route.ts
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    await addDoc(collection(db, "banners"), data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving banner:", error);
    return NextResponse.json({ error: "Failed to save banner" }, { status: 500 });
  }
}
