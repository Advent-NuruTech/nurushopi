import { addDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function notifySeniorAdmins(params: {
  title: string;
  body: string;
  type: string;
  relatedId?: string;
}) {
  const { title, body, type, relatedId } = params;
  const adminsSnap = await getDocs(
    query(collection(db, "admins"), where("role", "==", "senior"))
  );
  const seniorIds = adminsSnap.docs.map((d) => d.id);

  await Promise.all(
    seniorIds.map((adminId) =>
      addDoc(collection(db, "notifications"), {
        recipientType: "admin",
        recipientId: adminId,
        type,
        title,
        body,
        relatedId: relatedId ?? null,
        readAt: null,
        createdAt: serverTimestamp(),
      })
    )
  );
}
