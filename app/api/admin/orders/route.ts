import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/adminLogs";
import { notifySeniorAdmins } from "@/lib/notifications";

function toDateStr(t: unknown): string {
  if (!t) return new Date().toISOString();
  if (typeof (t as { toDate?: () => Date }).toDate === "function") {
    return (t as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof t === "string") return t;
  if (typeof t === "number") return new Date(t).toISOString();
  return new Date().toISOString();
}

/**
 * GET: list orders
 * - Senior admin: all orders
 * - Sub admin: orders containing at least one product they created
 */
export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const productIds = new Set<string>();

    if (admin.role === "sub") {
      const prodsSnap = await getDocs(
        query(
          collection(db, "products"),
          where("createdBy", "==", admin.adminId)
        )
      );

      prodsSnap.forEach((d) => productIds.add(d.id));
    }

    const ordersSnap = await getDocs(
      query(collection(db, "orders"), orderBy("createdAt", "desc"))
    );

    let orders = ordersSnap.docs.map((d) => {
      const data = d.data();
      const items =
        (data.items ?? []) as {
          id?: string;
          productId?: string;
          name?: string;
          price?: number;
          quantity?: number;
          image?: string;
          mode?: "wholesale" | "retail";
        }[];

      return {
        id: d.id,
        userId: data.userId ?? null,
        userEmail: data.userEmail ?? null,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        country: data.country,
        county: data.county,
        locality: data.locality,
        message: data.message ?? "",
        items,
        totalAmount: data.totalAmount ?? 0,
        status: data.status ?? "pending",
        cancellationReason:
          typeof data.cancellationReason === "string"
            ? data.cancellationReason
            : null,
        approvedBy: data.approvedBy ?? null,
        createdAt: toDateStr(data.createdAt),
        updatedAt: data.updatedAt ? toDateStr(data.updatedAt) : undefined,
      };
    });

    if (admin.role === "sub") {
      orders = orders.filter((order) =>
        order.items.some(
          (it) =>
            (it.id && productIds.has(it.id)) ||
            (it.productId && productIds.has(it.productId))
        )
      );
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Admin orders list error:", error);
    return NextResponse.json(
      { error: "Failed to list orders" },
      { status: 500 }
    );
  }
}

/**
 * PUT: update order status
 * Body: { orderId, status }
 */
export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId, status } = (await request.json()) as {
      orderId?: string;
      status?: string;
    };

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId required" },
        { status: 400 }
      );
    }

    const ref = doc(db, "orders", orderId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (admin.role === "sub") {
      if (status !== "shipped") {
        return NextResponse.json(
          { error: "Sub Admin can only mark orders as shipped" },
          { status: 403 }
        );
      }

      const productsSnap = await getDocs(
        query(collection(db, "products"), where("createdBy", "==", admin.adminId))
      );
      const productIds = new Set<string>();
      productsSnap.forEach((d) => productIds.add(d.id));

      const data = snap.data();
      const items =
        (data.items ?? []) as { id?: string; productId?: string }[];
      const ownsAny = items.some(
        (it) => (it.id && productIds.has(it.id)) || (it.productId && productIds.has(it.productId))
      );
      if (!ownsAny) {
        return NextResponse.json(
          { error: "You can only update orders containing your products" },
          { status: 403 }
        );
      }

      await updateDoc(ref, {
        status: "shipped",
        shippedBy: admin.adminId,
        updatedAt: serverTimestamp(),
      });
      await logAdminAction({
        adminId: admin.adminId,
        action: "order_status_update",
        targetType: "order",
        targetId: orderId,
        metadata: { status: "shipped" },
      });
      return NextResponse.json({ success: true });
    }

    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    const orderData = snap.data() as Record<string, unknown>;

    if (status === "approved" || status === "received") {
      if (String(orderData.status ?? "") === "cancelled") {
        return NextResponse.json(
          { error: "Cancelled orders cannot be approved" },
          { status: 400 }
        );
      }
      updates.status = "received";
      updates.approvedBy = admin.adminId;
      updates.receivedAt = serverTimestamp();
    } else if (status === "cancelled") {
      if (String(orderData.status ?? "") === "received") {
        return NextResponse.json(
          { error: "Delivered orders cannot be cancelled" },
          { status: 400 }
        );
      }
      updates.status = "cancelled";
    }

    const currentStatus = orderData.status as string | undefined;
    const shouldApplyAffiliate =
      (status === "approved" || status === "received") &&
      currentStatus !== "received" &&
      currentStatus !== "cancelled" &&
      !(orderData.affiliateApplied as boolean | undefined);

    if (shouldApplyAffiliate) {
      const orderUserId = String(orderData.userId ?? "");
      const orderReferrerId = String(orderData.referrerId ?? "");
      let referrerId = orderReferrerId;

      if (!referrerId && orderUserId) {
        const userSnap = await getDoc(doc(db, "users", orderUserId));
        referrerId = String(userSnap.data()?.referredBy ?? "");
      }

      if (referrerId && referrerId !== orderUserId) {
        const total = Number(orderData.totalAmount ?? 0);
        const commission = Math.round(total * 0.01 * 100) / 100;
        if (commission > 0) {
          let walletBefore = 0;
          let walletAfter = 0;
          const walletTxRef = doc(collection(db, "wallet_transactions"));
          const userRef = doc(db, "users", referrerId);

          await runTransaction(db, async (tx) => {
            const userSnap = await tx.get(userRef);
            const userData = userSnap.exists() ? userSnap.data() : {};
            walletBefore = Number(userData?.walletBalance ?? 0);
            walletAfter = Math.max(0, walletBefore + commission);

            tx.set(
              userRef,
              {
                walletBalance: walletAfter,
                walletUpdatedAt: serverTimestamp(),
              },
              { merge: true }
            );

            tx.set(walletTxRef, {
              userId: referrerId,
              type: "credit",
              source: "affiliate",
              amount: commission,
              balanceAfter: walletAfter,
              orderId,
              createdAt: serverTimestamp(),
              status: "approved",
            });

            tx.update(ref, {
              affiliateApplied: true,
              affiliateAmount: commission,
              referrerId,
            });
          });

          if (walletBefore < 150 && walletAfter >= 150) {
            await notifySeniorAdmins({
              title: "Wallet ready for redemption",
              body: `User ${referrerId} wallet is ready for redemption.`,
              type: "wallet",
              relatedId: referrerId,
            });
          }

          await logAdminAction({
            adminId: admin.adminId,
            action: "affiliate_reward",
            targetType: "order",
            targetId: orderId,
            metadata: { referrerId, commission },
          });
        }
      }
    }

    await updateDoc(ref, updates);

    if (updates.status === "received" && currentStatus !== "received") {
      const userId = String(orderData.userId ?? "");
      if (userId) {
        await addDoc(collection(db, "notifications"), {
          recipientType: "user",
          recipientId: userId,
          type: "review_prompt",
          title: "Order delivered",
          body: "Your order was delivered. Share your review.",
          relatedId: orderId,
          readAt: null,
          createdAt: serverTimestamp(),
        });
      }
    }

    await logAdminAction({
      adminId: admin.adminId,
      action: "order_status_update",
      targetType: "order",
      targetId: orderId,
      metadata: { status: updates.status ?? status },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin order update error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
