import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, setDoc, where } from "firebase/firestore";

export type UserRole = "elderly" | "admin" | "companion";

export type AuthProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  phone?: string | null;
  terminated?: boolean;
  terminationReason?: string | null;
};

export type AuthUser = {
  id: string;
  name: string;
  role: UserRole;
  terminated?: boolean;
  terminationReason?: string | null;
};

const STORAGE_PROFILE_KEY = "elderease_auth_profile";
const setLocalProfile = (p: AuthProfile | null) => {
  if (!p) {
    localStorage.removeItem(STORAGE_PROFILE_KEY);
    return;
  }
  const compact: AuthUser = {
    id: p.uid,
    name: p.displayName ?? p.email ?? "User",
    role: p.role,
    ...(p.terminated !== undefined && { terminated: p.terminated }),
    ...(p.terminationReason !== undefined && { terminationReason: p.terminationReason }),
  };
  localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(compact));
};

export const getCurrentUser = (): AuthUser | null => {
  const raw = localStorage.getItem(STORAGE_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

const ADMIN_EMAIL = "admin@gmail.com"; // pre-made admin; do not sign up

export const requireRoleRedirectPath = (role: UserRole): string => {
  if (role === "elderly") return "/elder";
  if (role === "admin") return "/admin";
  return "/companion";
};

export const getUserProfile = async (user: User): Promise<AuthProfile | null> => {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as { role: UserRole; displayName?: string | null; phone?: string | null; email?: string | null; status?: string; terminationReason?: string | null };
  let terminated = (data.status || "").toLowerCase() === "terminated";
  let terminationReason: string | null = terminated ? (data.terminationReason ?? null) : null;
  // Fallback: companions may have been terminated via pendingVolunteers only (e.g. before users sync)
  if (data.role === "companion" && !terminated) {
    const email = (user.email ?? data.email ?? "").toString().trim().toLowerCase();
    if (email) {
      try {
        const q = query(collection(db, "pendingVolunteers"), where("email", "==", email), where("status", "==", "terminated"), limit(1));
        const pvSnap = await getDocs(q);
        if (!pvSnap.empty) {
          terminated = true;
          const pvData = pvSnap.docs[0].data() as any;
          terminationReason = pvData?.terminationReason ?? null;
        }
      } catch {}
    }
  }
  return {
    uid: user.uid,
    email: user.email ?? data.email ?? null,
    displayName: user.displayName ?? data.displayName ?? null,
    role: data.role,
    phone: data.phone ?? null,
    terminated: terminated || undefined,
    terminationReason: terminated ? terminationReason : undefined,
  };
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  role: Exclude<UserRole, "admin">,
  displayName?: string,
  phone?: string,
): Promise<AuthProfile> => {
  const normalizedEmail = email.trim().toLowerCase();

  // Cross-check: if this email is in approved pendingVolunteers, force role to companion
  let resolvedRole: Exclude<UserRole, "admin"> = role;
  try {
    const q = query(
      collection(db, "pendingVolunteers"),
      where("email", "==", normalizedEmail),
      where("status", "==", "approved"),
      limit(1),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      resolvedRole = "companion";
    }
  } catch {
    // If rules forbid read, ignore and proceed with provided role
  }

  const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  // Create minimal user profile in Firestore
  const ref = doc(db, "users", cred.user.uid);
  await setDoc(ref, {
    role: resolvedRole,
    displayName: displayName ?? null,
    email: normalizedEmail,
    phone: phone ?? null,
    createdAt: Date.now(),
  });
  const profile = { uid: cred.user.uid, email: cred.user.email, displayName: displayName ?? null, role: resolvedRole, phone: phone ?? null };
  setLocalProfile(profile);
  return profile;
};

export const loginWithEmail = async (email: string, password: string): Promise<AuthProfile> => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getUserProfile(cred.user);
  const normalizedEmail = (email || "").trim().toLowerCase();
  // Allow terminated volunteers to log in – they will see a restricted view with the reason
  if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    const adminProfile = { uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName, role: "admin" as const };
    setLocalProfile(adminProfile);
    return adminProfile;
  }
  if (!profile) throw new Error("Missing user profile. Please sign up first.");
  // If terminated, include reason so companion pages can show restricted view
  setLocalProfile(profile);
  return profile;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  setLocalProfile(null);
};

export const subscribeToAuth = (cb: (user: AuthProfile | null) => void) => {
  let userDocUnsub: (() => void) | null = null;
  return onAuthStateChanged(auth, async (u) => {
    // Cleanup previous doc subscription
    if (userDocUnsub) {
      userDocUnsub();
      userDocUnsub = null;
    }
    if (!u) {
      setLocalProfile(null);
      cb(null);
      return;
    }
    if (u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      const adminP = { uid: u.uid, email: u.email, displayName: u.displayName, role: "admin" as const };
      setLocalProfile(adminP);
      cb(adminP);
      return;
    }
    // Live subscribe to the user's Firestore profile so edits reflect everywhere instantly
    userDocUnsub = onSnapshot(doc(db, "users", u.uid), async (snap) => {
      if (!snap.exists()) {
        setLocalProfile(null);
        cb(null);
        return;
      }
      const data = snap.data() as any;
      let terminated = (data?.status || "").toLowerCase() === "terminated";
      let terminationReason: string | null = terminated ? (data?.terminationReason ?? null) : null;
      // Fallback: companions may have been terminated via pendingVolunteers only (e.g. before users sync)
      if (data?.role === "companion" && !terminated) {
        const email = (u.email ?? data?.email ?? "").toString().trim().toLowerCase();
        if (email) {
          try {
            const q = query(collection(db, "pendingVolunteers"), where("email", "==", email), where("status", "==", "terminated"), limit(1));
            const pvSnap = await getDocs(q);
            if (!pvSnap.empty) {
              terminated = true;
              const pvData = pvSnap.docs[0].data() as any;
              terminationReason = pvData?.terminationReason ?? null;
            }
          } catch {}
        }
      }
      const profile: AuthProfile = {
        uid: u.uid,
        email: u.email ?? data?.email ?? null,
        displayName: u.displayName ?? data?.displayName ?? null,
        role: data?.role,
        phone: data?.phone ?? null,
        ...(terminated && { terminated: true, terminationReason }),
      };
      setLocalProfile(profile);
      cb(profile);
    });
  });
};


