"use client";

import React from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <AppLayout title="Payment Cancelled">
      <div className="max-w-md mx-auto flex items-center justify-center min-h-[50vh]">
        <Card className="shadow-lg rounded-xl w-full border-t-4 border-orange-400">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <XCircle className="h-20 w-20 text-orange-400 animate-in zoom-in-50 duration-500" />
            <CardTitle className="text-2xl text-orange-500">
              Payment Cancelled
            </CardTitle>
            <p className="text-muted-foreground text-sm text-center">
              Your payment was cancelled. No charges were made.
              You can try again whenever you&apos;re ready.
            </p>
            <div className="w-full space-y-2 pt-2">
              <Link href="/pricing" passHref>
                <Button className="w-full" size="lg">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </Link>
              <Link href="/dashboard" passHref>
                <Button className="w-full" variant="outline" size="lg">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
