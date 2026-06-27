import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  limit,
} from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

type VendorStatus = "pending" | "approved" | "rejected";

type VendorApplicationRecord = {
  id: string;
  status: VendorStatus;
  email: string;
  phone?: string;
  ownerName?: string;
  businessName?: string;
  businessType?: string;
  denomination?: string;
  country?: string;
  county?: string;
  city?: string;
  address?: string;
  category?: string;
  description?: string;
  products?: string[];
  createdAt?: unknown;
  reviewedAt?: unknown;
  rejectionReason?: string | null;
};

const isVendorStatus = (value: string): value is VendorStatus =>
  value === "pending" || value === "approved" || value === "rejected";

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const url = new URL(request.url);
    const statusParam = String(url.searchParams.get("status") ?? "all").toLowerCase();
    const search = String(url.searchParams.get("search") ?? "").trim().toLowerCase();
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") ?? "10")));

    const snap = await getDocs(query(collection(db, "vendorApplications"), orderBy("createdAt", "desc")));
    let applications = snap.docs.map((applicationDoc) => {
      const data = applicationDoc.data() as Record<string, unknown>;
      return {
        id: applicationDoc.id,
        status: isVendorStatus(String(data.status ?? "pending"))
          ? (data.status as VendorStatus)
          : "pending",
        email: String(data.email ?? ""),
        phone: String(data.phone ?? ""),
        ownerName: String(data.ownerName ?? ""),
        businessName: String(data.businessName ?? ""),
        businessType: String(data.businessType ?? ""),
        denomination: String(data.denomination ?? ""),
        country: String(data.country ?? ""),
        county: String(data.county ?? ""),
        city: String(data.city ?? ""),
        address: String(data.address ?? ""),
        category: String(data.category ?? ""),
        description: String(data.description ?? ""),
        products: Array.isArray(data.products) ? (data.products as string[]) : [],
        createdAt: data.createdAt ?? null,
        reviewedAt: data.reviewedAt ?? null,
        rejectionReason:
          typeof data.rejectionReason === "string" ? data.rejectionReason : null,
      } as VendorApplicationRecord;
    });

    if (isVendorStatus(statusParam)) {
      applications = applications.filter((app) => app.status === statusParam);
    }

    if (search) {
      applications = applications.filter((app) =>
        [
          app.businessName,
          app.ownerName,
          app.email,
          app.phone ?? "",
          app.category ?? "",
          app.city ?? "",
          app.county ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    const total = applications.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const items = applications.slice(start, start + pageSize);

    return NextResponse.json({ items, total, page, pageSize, totalPages });
  } catch (error) {
    console.error("Vendor applications list error:", error);
    return NextResponse.json({ error: "Failed to list vendor applications" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = (await request.json()) as {
      id?: string;
      status?: VendorStatus;
      rejectionReason?: string;
    };
    const applicationId = String(body.id ?? "").trim();
    const nextStatus = String(body.status ?? "").trim().toLowerCase();

    if (!applicationId) {
      return NextResponse.json({ error: "Application id is required" }, { status: 400 });
    }
    if (!isVendorStatus(nextStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const ref = doc(db, "vendorApplications", applicationId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const data = snap.data() as Record<string, unknown>;

    if (nextStatus === "approved") {
      const email = String(data.email ?? "").trim().toLowerCase();
      if (email) {
        const existingVendorSnap = await getDocs(
          query(collection(db, "vendors"), where("email", "==", email), limit(1))
        );
        const vendorPayload = {
          businessName: String(data.businessName ?? ""),
          ownerName: String(data.ownerName ?? ""),
          email,
          phone: String(data.phone ?? ""),
          businessType: String(data.businessType ?? ""),
          category: String(data.category ?? ""),
          products: Array.isArray(data.products) ? data.products : [],
          location: {
            country: String(data.country ?? ""),
            county: String(data.county ?? ""),
            city: String(data.city ?? ""),
            address: String(data.address ?? ""),
          },
          verified: true,
          approvedBy: admin.adminId,
          approvedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (!existingVendorSnap.empty) {
          await updateDoc(doc(db, "vendors", existingVendorSnap.docs[0].id), vendorPayload);
        } else {
          await addDoc(collection(db, "vendors"), {
            ...vendorPayload,
            createdAt: serverTimestamp(),
          });
        }
      }
    }

    await updateDoc(ref, {
      status: nextStatus,
      reviewedBy: admin.adminId,
      reviewedAt: serverTimestamp(),
      rejectionReason: nextStatus === "rejected" ? String(body.rejectionReason ?? "") : null,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vendor applications update error:", error);
    return NextResponse.json({ error: "Failed to update vendor application" }, { status: 500 });
  }
}
