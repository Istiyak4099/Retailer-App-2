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
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import GlobalLoading from "@/app/loading";
import { useToast } from "./use-toast";
import { Button } from "@/components/ui/button";

type AuthStatus = "loading" | "unauthenticated" | "authenticated";
type OnboardingStatus = "loading" | "pending" | "completed";

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  authStatus: AuthStatus;
  onboardingStatus: OnboardingStatus;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>("loading");

  const router = useRouter();
  const pathname = usePathname();
  const { toast, dismiss } = useToast();

  const handleClaimFreeKeys = async (uid: string) => {
    if (!uid) return;
    const userDocRef = doc(db, "Retailers", uid);
    await setDoc(userDocRef, { key_balance: 5 }, { merge: true });
    toast({
        title: "Keys Claimed!",
        description: "5 free keys have been added to your balance.",
    });
  }

  const showClaimKeysToast = (uid: string) => {
      const { id } = toast({
          title: "Welcome! Claim 5 free keys to start",
          description: "Activate your first customers on us.",
          duration: Infinity,
          action: (
              <Button
                  onClick={() => {
                      handleClaimFreeKeys(uid);
                      dismiss(id);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white mt-2 w-full"
              >
                Claim
              </Button>
          )
      });
  }

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
              setAuthStatus("authenticated");
              if (data.isOnboarded) {
                setOnboardingStatus("completed");
                if (data.key_balance === undefined) {
                  showClaimKeysToast(firebaseUser.uid);
                }
              } else {
                setOnboardingStatus("pending");
              }
            } else {
              setAuthStatus("authenticated");
              setOnboardingStatus("pending");
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error with Firestore snapshot listener:", error);
            setAuthStatus("unauthenticated");
            setOnboardingStatus("pending");
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setAuthStatus("unauthenticated");
        setOnboardingStatus("pending"); // Fix: Set to pending, not loading
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
    const isPricingRoute = pathname === "/pricing";

    if (loading || (user && (authStatus === 'loading' || onboardingStatus === 'loading'))) return;

    if (authStatus === "unauthenticated" && !isAuthRoute) {
      router.push("/login");
    } else if (authStatus === "authenticated") {
       if (onboardingStatus === 'pending' && !isOnboardingRoute) {
         router.push('/onboarding');
       } else if (onboardingStatus === 'completed' && (isAuthRoute || isRootRoute)) {
         router.push('/dashboard');
       }
    }
  }, [authStatus, onboardingStatus, loading, user, pathname, router]);

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
  
  const value = { user, loading, authStatus, onboardingStatus, signInWithGoogle, logout };
  
  const showGlobalLoading = loading || (user && (authStatus === 'loading' || onboardingStatus === 'loading'));
  if (showGlobalLoading) {
    return <GlobalLoading />;
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
