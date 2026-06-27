import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { HERO_DEFAULT_GRADIENT, resolveHeroGradient } from "@/lib/heroGradients";

type HeroAnnouncement = {
  id: string;
  text: string;
  gradient: string;
  order: number;
  isActive: boolean;
};

export async function GET() {
  try {
    // Keep query index-light: filter active items in memory.
    const snap = await getDocs(
      query(collection(db, "hero_announcements"), orderBy("order", "asc"))
    );

    const items: HeroAnnouncement[] = snap.docs.map((docSnap, index) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        text: String(data.text ?? "").trim(),
        gradient: resolveHeroGradient(
          String(data.gradient ?? "").trim() || HERO_DEFAULT_GRADIENT
        ),
        order:
          typeof data.order === "number" && Number.isFinite(data.order)
            ? data.order
            : index,
        isActive: Boolean(data.isActive ?? true),
      };
    });

    return NextResponse.json({
      announcements: items.filter(
        (item) => item.isActive && item.text.length > 0
      ),
    });
  } catch (error) {
    console.error("Hero announcements GET error:", error);
    return NextResponse.json({ announcements: [] }, { status: 200 });
  }
}
