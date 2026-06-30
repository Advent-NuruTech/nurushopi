/**
 * Memory-safe batched Firestore reader. Pages through a collection ordered by
 * document id using startAfter cursors, yielding one batch at a time. The whole
 * collection is never held in memory.
 */
import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { firestore } from "./firebase.js";

export interface BatchDoc {
  id: string;
  data: DocumentData;
  /** Firestore path, useful for sub-collection reads / debugging. */
  path: string;
  ref: QueryDocumentSnapshot<DocumentData>["ref"];
}

/**
 * Async generator yielding batches of documents from a top-level collection.
 * Ordered by __name__ so pagination is stable and resumable.
 */
export async function* readBatches(
  collection: string,
  batchSize: number,
): AsyncGenerator<BatchDoc[], void, unknown> {
  const db = firestore();
  let cursor: QueryDocumentSnapshot<DocumentData> | undefined;

  for (;;) {
    let q = db.collection(collection).orderBy("__name__").limit(batchSize);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) return;

    yield snap.docs.map((d) => ({
      id: d.id,
      data: d.data(),
      path: d.ref.path,
      ref: d.ref,
    }));

    if (snap.size < batchSize) return;
    cursor = snap.docs[snap.docs.length - 1];
  }
}

/** Read an entire collection into an array. Use only for small lookup tables. */
export async function readAll(collection: string): Promise<BatchDoc[]> {
  const out: BatchDoc[] = [];
  for await (const batch of readBatches(collection, 500)) out.push(...batch);
  return out;
}
