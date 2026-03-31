import { CompanionNavbar } from "@/components/companion/CompanionNavbar";
import { subscribeToAuth, type AuthProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { IdDocumentView } from "@/components/IdDocumentView";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Camera, Loader2, Trash2, User } from "lucide-react";

const MAX_PHOTO_SIZE_MB = 2;
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const Profile = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [auth, setAuth] = useState<AuthProfile | null>(null);
  const [idDoc, setIdDoc] = useState<{ idFileUrl: string | null; idFileName?: string | null } | null>(null);
  const [volunteerDoc, setVolunteerDoc] = useState<{ id: string; profilePhotoUrl?: string | null; profilePhotoStoragePath?: string | null; previousTerminationReason?: string | null } | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAuth(setAuth);
    return () => unsub();
  }, []);

  useEffect(() => {
    const email = (auth?.email ?? "").trim().toLowerCase();
    if (!email || auth?.role !== "companion") {
      setIdDoc(null);
      setVolunteerDoc(null);
      return;
    }
    const q = query(collection(db, "pendingVolunteers"), where("email", "==", email));
    const unsub = onSnapshot(q, (snap) => {
      const docSnap = snap.docs[0];
      if (!docSnap) {
        setIdDoc(null);
        setVolunteerDoc(null);
        return;
      }
      const d = docSnap.data() as { idFileUrl?: string | null; idFileName?: string | null; profilePhotoUrl?: string | null; profilePhotoStoragePath?: string | null; previousTerminationReason?: string | null };
      setIdDoc({ idFileUrl: d.idFileUrl ?? null, idFileName: d.idFileName });
      setVolunteerDoc({
        id: docSnap.id,
        profilePhotoUrl: d.profilePhotoUrl ?? null,
        profilePhotoStoragePath: d.profilePhotoStoragePath ?? null,
        previousTerminationReason: d.previousTerminationReason ?? null,
      });
    });
    return () => unsub();
  }, [auth?.email, auth?.role]);

  const deleteOldPhotoFromStorage = async (storagePath: string | null | undefined) => {
    if (!storagePath?.startsWith("profile-photos/")) return;
    try {
      const oldRef = ref(storage, storagePath);
      await deleteObject(oldRef);
    } catch (e: any) {
      if (e?.code !== "storage/object-not-found") {
        console.warn("Could not delete old photo:", e?.message);
      }
    }
  };

  const handlePhotoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !volunteerDoc || !auth?.uid) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please use JPEG, PNG, WebP, or GIF.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      toast({ title: "File too large", description: `Please use a file under ${MAX_PHOTO_SIZE_MB}MB.`, variant: "destructive" });
      return;
    }
    setPhotoUploading(true);
    try {
      await deleteOldPhotoFromStorage(volunteerDoc.profilePhotoStoragePath);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `profile-photos/${auth.uid}/${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "pendingVolunteers", volunteerDoc.id), {
        profilePhotoUrl: url,
        profilePhotoStoragePath: path,
      });
      toast({ title: "Profile photo updated" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!volunteerDoc) return;
    setPhotoUploading(true);
    try {
      await deleteOldPhotoFromStorage(volunteerDoc.profilePhotoStoragePath);
      await updateDoc(doc(db, "pendingVolunteers", volunteerDoc.id), {
        profilePhotoUrl: null,
        profilePhotoStoragePath: null,
      });
      toast({ title: "Profile photo removed" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setPhotoUploading(false);
    }
  };

  const formatPH = (phone?: string | null): string => {
    if (!phone) return "—";
    const raw = phone.trim();
    if (raw.startsWith("+63")) return raw;
    const digits = raw.replace(/\D+/g, "");
    if (digits.startsWith("639") && digits.length === 12) return `+${digits}`;
    if (digits.startsWith("09") && digits.length === 11) return `+63${digits.slice(1)}`;
    if (digits.startsWith("9") && digits.length === 10) return `+63${digits}`;
    return raw;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <CompanionNavbar />
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">My Profile</h1>
        <div className="grid gap-6 md:grid-cols-[1fr,auto]">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {auth?.role === "companion" && volunteerDoc?.previousTerminationReason && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900 dark:text-amber-100">Previous termination notice</p>
                      <p className="mt-1 text-amber-800 dark:text-amber-200/90">
                        Your account was previously terminated for the following reason:
                      </p>
                      <p className="mt-2 italic">&ldquo;{volunteerDoc.previousTerminationReason}&rdquo;</p>
                      <p className="mt-2 text-sm text-amber-700 dark:text-amber-300/80">
                        Your account has been reactivated. Please keep this feedback in mind as you continue volunteering.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {auth?.role === "companion" && volunteerDoc && (
                <div className="flex items-center gap-4 pb-4 border-b border-muted/50">
                  <div className="relative shrink-0">
                    <div className="h-24 w-24 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
                      {volunteerDoc.profilePhotoUrl ? (
                        <img src={volunteerDoc.profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    {photoUploading && (
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Profile photo</p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ALLOWED_TYPES.join(",")}
                        className="hidden"
                        onChange={handlePhotoFileSelect}
                      />
                      {!volunteerDoc.profilePhotoUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={photoUploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-1.5"
                        >
                          <Camera className="h-4 w-4" />
                          Add photo
                        </Button>
                      )}
                      {volunteerDoc.profilePhotoUrl && (
                        <Button variant="outline" size="sm" disabled={photoUploading} onClick={handleDeletePhoto} className="gap-1.5 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          Delete photo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1 py-2 border-b border-muted/50">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</span>
                  <span className="font-medium">{auth?.displayName || "—"}</span>
                </div>
                <div className="flex flex-col gap-1 py-2 border-b border-muted/50">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</span>
                  <span className="font-medium break-all">{auth?.email || "—"}</span>
                </div>
                <div className="flex flex-col gap-1 py-2 border-b border-muted/50">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</span>
                  <span className="font-medium">{formatPH(auth?.phone)}</span>
                </div>
                <div className="flex flex-col gap-1 py-2 border-b border-muted/50">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</span>
                  <span className="font-medium capitalize">{auth?.role || "—"}</span>
                </div>
                <div className="flex flex-col gap-1 py-2 border-b border-muted/50 sm:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User ID</span>
                  <span className="font-mono text-xs font-medium truncate">{auth?.uid || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          {auth?.role === "companion" && (
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>ID Document</CardTitle>
                <p className="text-sm text-muted-foreground">Your submitted ID from your volunteer application</p>
              </CardHeader>
              <CardContent>
                <IdDocumentView
                  url={idDoc?.idFileUrl ?? null}
                  fileName={idDoc?.idFileName}
                  name={auth?.displayName || auth?.email || "Volunteer"}
                  className="w-full max-w-[240px]"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;


