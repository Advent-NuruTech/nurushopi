import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { formatCategoryLabel, slugifyCategory } from "@/lib/categoryUtils";

export async function GET() {
  try {
    const snap = await getDocs(query(collection(db, "categories"), orderBy("name_lowercase", "asc")));
    if (!snap.empty) {
      const categories = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? "",
          slug: data.slug ?? "",
          icon: data.icon ?? "",
          description: data.description ?? "",
        };
      });
      return NextResponse.json({ categories });
    }

    // Fallback: derive categories from products if no category docs exist
    const productSnap = await getDocs(collection(db, "products"));
    const slugSet = new Set<string>();
    productSnap.forEach((doc) => {
      const data = doc.data();
      const raw = String(data.category ?? "").trim();
      if (raw) slugSet.add(slugifyCategory(raw));
    });

    const categories = Array.from(slugSet)
      .filter(Boolean)
      .sort()
      .map((slug) => ({
        id: slug,
        name: formatCategoryLabel(slug),
        slug,
        icon: "",
        description: "",
      }));

    return NextResponse.json({ categories });
  } catch (e) {
    console.error("Categories list error:", e);
    return NextResponse.json({ error: "Failed to list categories" }, { status: 500 });
  }
}
