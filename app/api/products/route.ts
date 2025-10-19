import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";

// ====================================
// 🟢 Types
// ====================================

interface Product {
  id?: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  category?: string;
  name_lowercase?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

// ====================================
// 🟢 GET — Fetch all products
// ====================================
export async function GET() {
  try {
    const snapshot = await getDocs(collection(db, "products"));
    const products: Product[] = snapshot.docs.map(
      (doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...(doc.data() as Omit<Product, "id">),
      })
    );
    return NextResponse.json(products);
  } catch (error) {
    console.error("🔥 Products GET Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ====================================
// 🟢 POST — Add new product
// ====================================
export async function POST(req: Request) {
  try {
    const body: Product = await req.json();

    if (!body.name || !body.price) {
      return NextResponse.json(
        { error: "Missing required fields: name or price" },
        { status: 400 }
      );
    }

    const productData: Omit<Product, "id"> = {
      ...body,
      name_lowercase: body.name.toLowerCase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "products"), productData);

    return NextResponse.json({
      id: docRef.id,
      message: "Product added successfully",
      success: true,
    });
  } catch (error) {
    console.error("🔥 Products POST Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ====================================
// 🟡 PUT — Update existing product
// ====================================
export async function PUT(req: Request) {
  try {
    const { id, ...data } = (await req.json()) as Product;

    if (!id) {
      return NextResponse.json(
        { error: "Missing product ID" },
        { status: 400 }
      );
    }

    const updates: Partial<Product> = { ...data };

    if (updates.name) {
      updates.name_lowercase = updates.name.toLowerCase();
    }

    updates.updatedAt = serverTimestamp();

    await updateDoc(doc(db, "products", id), updates);

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("🔥 Products PUT Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ====================================
// 🔴 DELETE — Remove product
// ====================================
export async function DELETE(req: Request) {
  try {
    const { id } = (await req.json()) as { id: string };

    if (!id) {
      return NextResponse.json(
        { error: "Missing product ID" },
        { status: 400 }
      );
    }

    await deleteDoc(doc(db, "products", id));

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("🔥 Products DELETE Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
