import { Outlet, useNavigate, useNavigationType } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getCurrentUser, logout, subscribeToAuth, type AuthProfile } from "@/lib/auth";

/**
 * Tracks whether the admin section has already been entered during this page
 * session. Module-level so it survives the gate unmounting (e.g. when the admin
 * navigates out to the landing or login page) and resets on a full page reload.
 */
let adminGateEntered = false;

/**
 * Guards all /admin routes.
 *
 * 1. Baseline auth guard: only an authenticated admin may view the pages.
 * 2. Forward/Back protection: navigating *within* the admin section is fine,
 *    but once the admin has left to a public page (landing or login) they may
 *    not use the browser Forward/Back button to re-enter their account without
 *    logging in again. Because every admin page renders inside this gate, the
 *    gate stays mounted while moving between admin pages and only unmounts when
 *    the admin leaves the section. So a history navigation ("POP") that
 *    re-mounts the gate means they are coming back in from outside.
 */
const AdminGate = () => {
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getCurrentUser());
  const [blocked, setBlocked] = useState(false);

  // Run once on mount: detect a Forward/Back re-entry from a public page.
  const blockedRef = useRef(false);
  useEffect(() => {
    if (navigationType === "POP" && adminGateEntered) {
      blockedRef.current = true;
      setBlocked(true);
      // Clear the session and force a fresh login.
      logout();
      window.location.replace("/login");
      return;
    }
    adminGateEntered = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Baseline auth: keep in sync with auth state and redirect out if not an admin.
  useEffect(() => {
    const unsub = subscribeToAuth((p: AuthProfile | null) => {
      if (!p) {
        setUser(null);
        return;
      }
      setUser({
        id: p.uid,
        name: p.displayName ?? p.email ?? "User",
        role: p.role,
      });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (blockedRef.current) return;
    if (!user || user.role !== "admin") {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  if (blocked || !user || user.role !== "admin") {
    return null;
  }

  return <Outlet />;
};

export default AdminGate;
