/**
 * Auto-discovery: enumerate every top-level Firestore collection, sample
 * documents, and infer each field's type (string / number / boolean / timestamp
 * / geopoint / reference / array / map / null). Also probes for nested
 * sub-collections on a sample of documents. Output feeds the discovery report
 * so the operator can confirm the mapping plan against their REAL data before
 * migrating.
 */
import { Timestamp, GeoPoint, DocumentReference } from "firebase-admin/firestore";
import { firestore } from "./firebase.js";
import { log } from "./logger.js";

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "timestamp"
  | "geopoint"
  | "reference"
  | "array"
  | "map"
  | "null"
  | "unknown";

export interface FieldStat {
  types: Record<FieldType, number>;
  present: number;
  nullable: boolean;
  sampleRef?: string;
}

export interface CollectionShape {
  name: string;
  count: number; // exact (uses count() aggregate)
  sampled: number;
  fields: Record<string, FieldStat>;
  subcollections: string[];
}

function typeOf(v: unknown): FieldType {
  if (v === null || v === undefined) return "null";
  if (v instanceof Timestamp) return "timestamp";
  if (v instanceof GeoPoint) return "geopoint";
  if (v instanceof DocumentReference) return "reference";
  if (Array.isArray(v)) return "array";
  switch (typeof v) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "map";
    default:
      return "unknown";
  }
}

export async function listCollections(): Promise<string[]> {
  const cols = await firestore().listCollections();
  return cols.map((c) => c.id).sort();
}

/** Exact document count via the server-side aggregate (cheap, no full read). */
export async function exactCount(collection: string): Promise<number> {
  try {
    const snap = await firestore().collection(collection).count().get();
    return snap.data().count;
  } catch (e) {
    log.warn(`count() failed for ${collection}; falling back to size of a capped read`, {
      error: String(e),
    });
    const docs = await firestore().collection(collection).select().get();
    return docs.size;
  }
}

export async function inspectCollection(
  collection: string,
  sampleSize = 200,
): Promise<CollectionShape> {
  const db = firestore();
  const count = await exactCount(collection);
  const snap = await db.collection(collection).limit(sampleSize).get();

  const fields: Record<string, FieldStat> = {};
  for (const doc of snap.docs) {
    const data = doc.data();
    for (const [key, val] of Object.entries(data)) {
      const t = typeOf(val);
      const stat = (fields[key] ??= {
        types: {
          string: 0, number: 0, boolean: 0, timestamp: 0, geopoint: 0,
          reference: 0, array: 0, map: 0, null: 0, unknown: 0,
        },
        present: 0,
        nullable: false,
      });
      stat.present += 1;
      stat.types[t] += 1;
      if (t === "null") stat.nullable = true;
      if (t === "reference" && !stat.sampleRef) {
        stat.sampleRef = (val as DocumentReference).path;
      }
    }
  }
  // A field present in fewer docs than were sampled is effectively nullable.
  for (const stat of Object.values(fields)) {
    if (stat.present < snap.size) stat.nullable = true;
  }

  // Probe sub-collections on the first few docs.
  const subSet = new Set<string>();
  for (const doc of snap.docs.slice(0, 5)) {
    const subs = await doc.ref.listCollections();
    subs.forEach((s) => subSet.add(s.id));
  }

  return {
    name: collection,
    count,
    sampled: snap.size,
    fields,
    subcollections: [...subSet].sort(),
  };
}

export async function discoverAll(sampleSize = 200): Promise<CollectionShape[]> {
  const names = await listCollections();
  log.info(`Discovered ${names.length} top-level collections`, { names });
  const shapes: CollectionShape[] = [];
  for (const name of names) {
    log.info(`Inspecting collection "${name}"…`);
    shapes.push(await inspectCollection(name, sampleSize));
  }
  return shapes;
}
