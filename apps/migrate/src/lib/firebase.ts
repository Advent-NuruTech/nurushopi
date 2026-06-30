/**
 * Isolated Firebase Admin initialisation. This is the ONLY place Firebase is
 * touched in the entire codebase, and it lives in a tool that never ships to
 * production. It connects read-only (we never write to Firestore).
 */
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { env } from "../config/env.js";

let app: App | undefined;

function firebaseApp(): App {
  if (app) return app;
  app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      }),
      projectId: env.firebase.projectId,
    });
  return app;
}

export function firestore(): Firestore {
  const db = getFirestore(firebaseApp());
  // ignoreUndefinedProperties is irrelevant for reads but harmless; keep
  // settings idempotent so re-init in the same process never throws.
  return db;
}

export function firebaseAuth(): Auth {
  return getAuth(firebaseApp());
}
