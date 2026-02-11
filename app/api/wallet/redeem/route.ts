import { NextResponse } from "next/server";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getClientKey, rateLimit } from "@/lib/rateLimit";
import { notifySeniorAdmins } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const rl = rateLimit(getClientKey(request), {
      limit: 5,
      windowMs: 60_000,
      keyPrefix: "redeem",
    });

    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = (await request.json()) as {
      userId?: string;
      type?: "cash" | "product";
      amount?: number;
      phone?: string;
      bankDetails?: string;
      productId?: string;
      productName?: string;
    };

    const userId = String(body.userId ?? "");
    const type = body.type;

    if (!userId || (type !== "cash" && type !== "product")) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const userSnap = await getDoc(doc(db, "users", userId));
    if (!userSnap.exists()) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const walletBalance = Number(
      userSnap.data()?.walletBalance ?? 0
    );

    if (walletBalance < 150) {
      return NextResponse.json(
        { error: "Wallet balance below minimum redemption amount" },
        { status: 400 }
      );
    }

    let amount = 0;
    let productName = body.productName ?? "";
    const productId = body.productId ?? "";

    if (type === "cash") {
      amount = Number(body.amount ?? 0);

      if (!amount || amount < 150 || amount > walletBalance) {
        return NextResponse.json(
          { error: "Invalid redemption amount" },
          { status: 400 }
        );
      }

      if (!body.phone && !body.bankDetails) {
        return NextResponse.json(
          { error: "Phone or bank details required" },
          { status: 400 }
        );
      }
    } else {
      if (!productId) {
        return NextResponse.json(
          { error: "Product required" },
          { status: 400 }
        );
      }

      const productSnap = await getDoc(
        doc(db, "products", productId)
      );

      if (!productSnap.exists()) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      const data = productSnap.data();

      productName = String(data?.name ?? "");
      amount = Number(data?.sellingPrice ?? data?.price ?? 0);

      if (!amount) {
        return NextResponse.json(
          { error: "Product not eligible for redemption" },
          { status: 400 }
        );
      }

      if (walletBalance < amount) {
        return NextResponse.json(
          { error: "Insufficient wallet balance" },
          { status: 400 }
        );
      }
    }

    const ref = await addDoc(
      collection(db, "wallet_redemptions"),
      {
        userId,
        type,
        amount,
        phone: body.phone ?? null,
        bankDetails: body.bankDetails ?? null,
        productId: type === "product" ? productId : null,
        productName: type === "product" ? productName : null,
        status: "pending",
        createdAt: serverTimestamp(),
      }
    );

    const details =
      type === "product"
        ? `Product: ${productName}`
        : body.phone
        ? `Phone: ${body.phone}`
        : body.bankDetails
        ? `Bank: ${body.bankDetails}`
        : "";

    await notifySeniorAdmins({
      title: "Redemption request",
      body:
        type === "product"
          ? `${userId} requested a product redemption. ${details}`.trim()
          : `${userId} wants to redeem KSh ${amount}. ${details}`.trim(),
      type: "wallet",
      relatedId: ref.id,
    });

    return NextResponse.json({ success: true, id: ref.id });
  } catch (e) {
    console.error("Wallet redeem error:", e);
    return NextResponse.json(
      { error: "Failed to submit redemption" },
      { status: 500 }
    );
  }
}
