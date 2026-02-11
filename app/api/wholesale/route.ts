import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export async function GET() {
  try {
    const q = query(
      collection(db, "products"),
      where("mode", "==", "wholesale")
    );

    const snap = await getDocs(q);

    const products = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ products });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ products: [] });
  }
}
