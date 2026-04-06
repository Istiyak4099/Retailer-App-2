"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { QrCode, PlusCircle, CreditCard, Loader2, ShoppingCart } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

export default function BalancePage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "Retailers", user.uid);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().key_balance || 0);
      } else {
        setBalance(0);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching balance:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <AppLayout title="Key Balance">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 shadow-lg rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available Activation Keys</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {loading || balance === null ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                        <div className="text-2xl font-bold">{balance}</div>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Each new customer activation consumes one key.
                    </p>
                </CardContent>
            </Card>
            <Card className="col-span-3 shadow-lg rounded-xl">
                 <CardHeader className="pb-2">
                    <CardTitle>Actions</CardTitle>
                    <CardDescription>Recharge your account balance by purchasing more keys.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                     <Link href="/pricing" passHref className="w-full">
                        <Button className="w-full">
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Purchase More Keys
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
        <Card className="shadow-lg rounded-xl mt-4">
            <CardHeader>
                <CardTitle>Usage History</CardTitle>
                <CardDescription>
                    Summary of your activation key usage.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground">
                    Recently activated profiles will appear in your customer list.
                </div>
            </CardContent>
        </Card>
    </AppLayout>
  );
}
