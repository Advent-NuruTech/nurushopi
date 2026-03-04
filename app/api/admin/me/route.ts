import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = String(admin.email ?? "").trim().toLowerCase();

  let hasVendorAccount = false;
  let hasVendorApplication = false;
  let hasUserAccount = false;
  let adminRoles: Array<"senior" | "sub"> = [admin.role];

  if (email) {
    try {
      const [adminsSnap, vendorsSnap, vendorApplicationsSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, "admins"), where("email", "==", email))),
        getDocs(query(collection(db, "vendors"), where("email", "==", email), limit(1))),
        getDocs(query(collection(db, "vendorApplications"), where("email", "==", email), limit(1))),
        getDocs(query(collection(db, "users"), where("email", "==", email), limit(1))),
      ]);

      const rolesFromDb = adminsSnap.docs
        .map((docSnap) => String(docSnap.data().role ?? ""))
        .filter((role): role is "senior" | "sub" => role === "senior" || role === "sub");

      if (rolesFromDb.length) {
        adminRoles = Array.from(new Set(rolesFromDb));
      }

      hasVendorAccount = !vendorsSnap.empty;
      hasVendorApplication = !vendorApplicationsSnap.empty;
      hasUserAccount = !usersSnap.empty;
    } catch (error) {
      console.error("Admin me linked-account lookup error:", error);
    }
  }

  const hasSeniorRole = adminRoles.includes("senior");
  const hasSubRole = adminRoles.includes("sub");

  return NextResponse.json({
    admin: {
      adminId: admin.adminId,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
    linkedAccounts: {
      adminRoles,
      hasSeniorRole,
      hasSubRole,
      hasVendorAccount,
      hasVendorApplication,
      hasUserAccount,
      canSwitchToSenior: admin.role === "sub" && hasSeniorRole,
      canMoveToUserProfile:
        admin.role === "senior" && (hasUserAccount || hasVendorAccount || hasSubRole),
    },
  });
}
