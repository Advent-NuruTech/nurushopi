import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = query(collection(db, "users"), where("pwaInstalled", "==", true));
  const snapshot = await getCountFromServer(q);

  return NextResponse.json({ totalInstalled: snapshot.data().count ?? 0 });
}
