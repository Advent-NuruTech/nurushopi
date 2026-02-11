import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { creditWallet, debitWallet } from "@/lib/wallet";
import { logAdminAction } from "@/lib/adminLogs";
import { notifySeniorAdmins } from "@/lib/notifications";

export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      userId?: string;
      amount?: number;
      type?: "credit" | "debit";
      reason?: string;
    };

    const userId = String(body.userId ?? "");
    const amount = Number(body.amount ?? 0);
    const type = body.type;

    if (!userId || !amount || (type !== "credit" && type !== "debit")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (type === "credit") {
      const result = await creditWallet({
        userId,
        amount,
        source: "adjustment",
        metadata: { reason: body.reason ?? "", adminId: admin.adminId },
      });
      if (result.before < 150 && result.after >= 150) {
        await notifySeniorAdmins({
          title: "Wallet ready for redemption",
          body: `User ${userId} wallet is ready for redemption.`,
          type: "wallet",
          relatedId: userId,
        });
      }
    } else {
      await debitWallet({
        userId,
        amount,
        source: "adjustment",
        metadata: { reason: body.reason ?? "", adminId: admin.adminId },
      });
    }

    await logAdminAction({
      adminId: admin.adminId,
      action: "wallet_adjustment",
      targetType: "user",
      targetId: userId,
      metadata: { amount, type, reason: body.reason ?? "" },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin wallet adjust error:", e);
    return NextResponse.json({ error: "Failed to adjust wallet" }, { status: 500 });
  }
}
