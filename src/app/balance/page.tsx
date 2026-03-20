"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { QrCode, PlusCircle, CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, increment, setDoc, getDoc } from "firebase/firestore";

const TEST_UID = "test-retailer-123";

export default function CodeBalancePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const docRef = doc(db, "Retailers", TEST_UID);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().key_balance || 0);
      } else {
        // Initialize if doesn't exist for testing
        setBalance(0);
        setDoc(docRef, { key_balance: 0 }, { merge: true });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleScan = () => {
    // Silent for scanner
  };

  const handleAddBalance = async () => {
      const docRef = doc(db, "Retailers", TEST_UID);
      await updateDoc(docRef, {
          key_balance: increment(10)
      });
      toast({
          title: (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <span>Balance Added</span>
            </div>
          ),
          description: "Added 10 codes for demonstration."
      });
  }

  return (
    <AppLayout title="Code Balance">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 shadow-lg rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available Codes</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                        <div className="text-2xl font-bold">{balance}</div>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Each customer activation consumes one code.
                    </p>
                </CardContent>
            </Card>
            <Card className="col-span-3 shadow-lg rounded-xl">
                 <CardHeader className="pb-2">
                    <CardTitle>Actions</CardTitle>
                    <CardDescription>Recharge your account balance.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                     <Button className="w-full" onClick={handleScan}>
                        <QrCode className="mr-2 h-4 w-4" />
                        Scan Recharge Card
                    </Button>
                    <Button variant="secondary" onClick={handleAddBalance}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Demo (10)
                    </Button>
                </CardContent>
            </Card>
        </div>
        <Card className="shadow-lg rounded-xl mt-4">
            <CardHeader>
                <CardTitle>Usage History</CardTitle>
                <CardDescription>
                    Summary of your activation code usage.
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
