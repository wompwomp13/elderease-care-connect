import { collection, deleteDoc, doc, getDocs, query, where, type Firestore } from "firebase/firestore";

/** Stored on `notifications` when a guardian submits a service request (before a volunteer is confirmed). */
export const SERVICE_REQUEST_PENDING_NOTIF_TYPE = "service_request_pending";

/** Removes “awaiting confirmation” rows so the list doesn’t duplicate once a visit is assigned or the request is cancelled. */
export async function deletePendingServiceRequestNotifications(db: Firestore, requestId: string): Promise<void> {
  if (!requestId) return;
  const snap = await getDocs(query(collection(db, "notifications"), where("requestId", "==", requestId)));
  await Promise.all(
    snap.docs
      .filter((d) => (d.data() as { type?: string }).type === SERVICE_REQUEST_PENDING_NOTIF_TYPE)
      .map((d) => deleteDoc(doc(db, "notifications", d.id)))
  );
}
