import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type WalletTransactionType = "credit" | "debit";
export type WalletTransactionSource = "affiliate" | "redeem" | "adjustment";

export async function creditWallet(params: {
  userId: string;
  amount: number;
  source: WalletTransactionSource;
  orderId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { userId, amount, source, orderId, metadata } = params;
  const userRef = doc(db, "users", userId);
  const txRef = doc(collection(db, "wallet_transactions"));

  let before = 0;
  let after = 0;

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const data = userSnap.exists() ? userSnap.data() : {};
    before = Number((data?.walletBalance as number | undefined) ?? 0);
    after = Math.max(0, before + amount);

    tx.set(
      userRef,
      {
        walletBalance: after,
        walletUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(txRef, {
      userId,
      type: "credit",
      source,
      amount,
      balanceAfter: after,
      orderId: orderId ?? null,
      metadata: metadata ?? {},
      createdAt: serverTimestamp(),
      status: "approved",
    });
  });

  return { before, after, transactionId: txRef.id };
}

export async function debitWallet(params: {
  userId: string;
  amount: number;
  source: WalletTransactionSource;
  redemptionId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { userId, amount, source, redemptionId, metadata } = params;
  const userRef = doc(db, "users", userId);
  const txRef = doc(collection(db, "wallet_transactions"));

  let before = 0;
  let after = 0;

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const data = userSnap.exists() ? userSnap.data() : {};
    before = Number((data?.walletBalance as number | undefined) ?? 0);
    if (before < amount) {
      throw new Error("Insufficient wallet balance");
    }

    after = Math.max(0, before - amount);
    tx.set(
      userRef,
      {
        walletBalance: after,
        walletUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(txRef, {
      userId,
      type: "debit",
      source,
      amount,
      balanceAfter: after,
      redemptionId: redemptionId ?? null,
      metadata: metadata ?? {},
      createdAt: serverTimestamp(),
      status: "approved",
    });
  });

  return { before, after, transactionId: txRef.id };
}
