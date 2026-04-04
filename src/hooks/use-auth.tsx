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
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import GlobalLoading from "@/app/loading";
import { ComplianceModal } from "@/components/auth/compliance-modal";
import { useToast } from "./use-toast";
import { Button } from "@/components/ui/button";

type AuthStatus = "loading" | "compliant" | "pending" | "unauthenticated";
type OnboardingStatus = "loading" | "pending" | "completed";

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  complianceStatus: AuthStatus;
  onboardingStatus: OnboardingStatus;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  handleComplianceConfirm: () => Promise<void>;
  handleComplianceDeny: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [complianceStatus, setComplianceStatus] = useState<AuthStatus>("loading");
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>("loading");
  const [actionLoading, setActionLoading] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, "Retailers", firebaseUser.uid);

        unsubscribeFirestore = onSnapshot(userDocRef, 
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.is_riba_free_compliant) {
                setComplianceStatus("compliant");
                if (data.isOnboarded) {
                  setOnboardingStatus("completed");
                } else {
                  setOnboardingStatus("pending");
                }
              } else {
                setComplianceStatus("pending");
              }
            } else {
              setComplianceStatus("pending");
              setOnboardingStatus("pending");
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error with Firestore snapshot listener:", error);
            setComplianceStatus("pending");
            setOnboardingStatus("pending");
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setComplianceStatus("unauthenticated");
        setOnboardingStatus("loading");
        setLoading(false);
      }
    });

    return () => {
        unsubscribeAuth();
        if (unsubscribeFirestore) {
            unsubscribeFirestore();
        }
    };
  }, []);

  useEffect(() => {
    const isAuthRoute = pathname === "/login";
    const isOnboardingRoute = pathname === "/onboarding";
    const isRootRoute = pathname === "/";

    if (loading || onboardingStatus === 'loading') return;

    if (complianceStatus === "unauthenticated" && !isAuthRoute) {
      router.push("/login");
    } else if (complianceStatus === "compliant") {
       if (onboardingStatus === 'pending' && !isOnboardingRoute) {
         router.push('/onboarding');
       } else if (onboardingStatus === 'completed' && (isAuthRoute || isRootRoute || isOnboardingRoute)) {
         router.push('/dashboard');
       }
    }
  }, [complianceStatus, onboardingStatus, loading, pathname, router]);

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
      // setDoc is imported from "firebase/firestore"
      await (await import("firebase/firestore")).setDoc(userDocRef, { is_riba_free_compliant: true, uid: user.uid }, { merge: true });
      // State will be updated by the onSnapshot listener.
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

  const value = { user, loading, complianceStatus, onboardingStatus, signInWithGoogle, logout, handleComplianceConfirm, handleComplianceDeny };
  
  if (loading || (user && (complianceStatus === 'loading' || onboardingStatus === 'loading'))) {
    return <GlobalLoading />;
  }

  if (complianceStatus === "pending") {
    return (
       <AuthContext.Provider value={value}>
         <ComplianceModal loading={actionLoading} />
       </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
