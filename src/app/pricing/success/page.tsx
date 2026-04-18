"use client";

import React, { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle, KeyRound } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type VerifyState = "verifying" | "success" | "already_processed" | "failed";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<VerifyState>("verifying");
  const [quantity, setQuantity] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [countdown, setCountdown] = useState(5);
  const verifiedRef = useRef(false);

  useEffect(() => {
    const invoiceId = searchParams.get("invoice_id");

    if (!invoiceId) {
      setState("failed");
      setErrorMsg("No invoice ID found. Invalid payment callback.");
      return;
    }

    // Prevent double verification in React Strict Mode
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    const verifyPayment = async () => {
      try {
        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoice_id: invoiceId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Verification failed.");
        }

        if (data.success) {
          setQuantity(data.quantity);
          setState(data.already_processed ? "already_processed" : "success");
        } else {
          setState("failed");
          setErrorMsg(data.message || "Payment was not completed.");
        }
      } catch (error: any) {
        console.error("Verification error:", error);
        setState("failed");
        setErrorMsg(error.message || "An error occurred during verification.");
      }
    };

    verifyPayment();
  }, [searchParams]);

  // Countdown timer for auto-redirect
  useEffect(() => {
    if (state !== "success" && state !== "already_processed") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, router]);

  return (
    <AppLayout title="Payment Status">
      <div className="max-w-md mx-auto flex items-center justify-center min-h-[50vh]">
        {state === "verifying" && (
          <Card className="shadow-lg rounded-xl w-full">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <CardTitle className="text-xl">Verifying Payment...</CardTitle>
              <p className="text-muted-foreground text-center text-sm">
                Please wait while we confirm your payment with UddoktaPay.
              </p>
            </CardContent>
          </Card>
        )}

        {(state === "success" || state === "already_processed") && (
          <Card className="shadow-lg rounded-xl w-full border-t-4 border-green-500">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <div className="relative">
                <CheckCircle className="h-20 w-20 text-green-500 animate-in zoom-in-50 duration-500" />
              </div>
              <CardTitle className="text-2xl text-green-600">
                Payment Successful!
              </CardTitle>
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 rounded-lg px-4 py-3">
                <KeyRound className="h-5 w-5 text-green-600" />
                <span className="text-lg font-semibold text-green-700 dark:text-green-400">
                  +{quantity} Keys Added
                </span>
              </div>
              {state === "already_processed" && (
                <p className="text-xs text-muted-foreground">
                  This payment was already processed.
                </p>
              )}
              <p className="text-muted-foreground text-sm text-center">
                Your keys have been credited to your account.
              </p>
              <div className="w-full space-y-2 pt-2">
                <Link href="/dashboard" passHref>
                  <Button className="w-full" size="lg">
                    Go to Dashboard ({countdown}s)
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {state === "failed" && (
          <Card className="shadow-lg rounded-xl w-full border-t-4 border-destructive">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <XCircle className="h-20 w-20 text-destructive animate-in zoom-in-50 duration-500" />
              <CardTitle className="text-2xl text-destructive">
                Verification Failed
              </CardTitle>
              <p className="text-muted-foreground text-sm text-center">
                {errorMsg}
              </p>
              <div className="w-full space-y-2 pt-2">
                <Link href="/pricing" passHref>
                  <Button className="w-full" size="lg">
                    Try Again
                  </Button>
                </Link>
                <Link href="/dashboard" passHref>
                  <Button className="w-full" variant="outline" size="lg">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
