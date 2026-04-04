"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import GlobalLoading from "@/app/loading";
import { ComplianceModal } from "@/components/auth/compliance-modal";
import { useToast } from "./use-toast";
import { Button } from "@/components/ui/button";

type ComplianceStatus = "loading" | "compliant" | "pending" | "unauthenticated";

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  complianceStatus: ComplianceStatus;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  handleComplianceConfirm: () => Promise<void>;
  handleComplianceDeny: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>("loading");
  const [actionLoading, setActionLoading] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDocRef = doc(db, "Retailers", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists() && userDoc.data().is_riba_free_compliant) {
            setComplianceStatus("compliant");
          } else {
            setComplianceStatus("pending");
          }
        } catch (error) {
          console.error("Error checking compliance status:", error);
          setComplianceStatus("pending");
        }
      } else {
        setUser(null);
        setComplianceStatus("unauthenticated");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const isAuthRoute = pathname === "/login";

    if (loading) return;

    if (complianceStatus === "unauthenticated" && !isAuthRoute) {
      router.push("/login");
    } else if (complianceStatus === "compliant" && isAuthRoute) {
      router.push("/dashboard");
    }
    // If 'pending', we render the modal, so no redirect is needed.
  }, [complianceStatus, loading, pathname, router]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error("Error signing in with Google", error);
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleComplianceConfirm = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const userDocRef = doc(db, "Retailers", user.uid);
      await setDoc(userDocRef, { is_riba_free_compliant: true, uid: user.uid }, { merge: true });
      setComplianceStatus("compliant");
      router.push('/onboarding');
    } catch (error) {
      console.error("Error saving compliance status:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplianceDeny = () => {
    toast({
      variant: "destructive",
      title: "Access Restricted / وصول محدود",
      description: "Our system is currently only available for zero-interest business models. / نظامنا متاح حالياً فقط لنماذج الأعمال التي لا تتعامل بالربا.",
      duration: Infinity,
      action: (
        <Button
          variant="secondary"
          onClick={logout}
          className="mt-4 w-full bg-white text-black hover:bg-white/90"
        >
          Exit / خروج
        </Button>
      ),
    });
  };

  const value = { user, loading, complianceStatus, signInWithGoogle, logout, handleComplianceConfirm, handleComplianceDeny };
  
  // Render loading spinner for initial auth check
  if (loading) {
    return <GlobalLoading />;
  }

  // If user is logged in but compliance is pending, show the modal overlay
  if (complianceStatus === "pending") {
    return (
       <AuthContext.Provider value={value}>
         <ComplianceModal loading={actionLoading} />
       </AuthContext.Provider>
    );
  }

  // If compliant, or on the login page, render children
  if (complianceStatus === "compliant" || pathname === '/login') {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  // Fallback for unauthenticated users not on login page
  return <GlobalLoading />;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
