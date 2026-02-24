import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AdminLogAction =
  | "order_status_update"
  | "review_approved"
  | "review_rejected"
  | "wallet_redeem_approved"
  | "wallet_redeem_rejected"
  | "wallet_adjustment"
  | "affiliate_reward"
  | "product_update"
  | "product_delete"
  | "wholesale_update"
  | "wholesale_delete"
  | "hero_create"
  | "hero_update"
  | "hero_delete";

export async function logAdminAction(params: {
  adminId: string;
  action: AdminLogAction;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  const { adminId, action, targetType, targetId, metadata } = params;
  await addDoc(collection(db, "admin_logs"), {
    adminId,
    action,
    targetType,
    targetId,
    metadata: metadata ?? {},
    createdAt: serverTimestamp(),
  });
}
