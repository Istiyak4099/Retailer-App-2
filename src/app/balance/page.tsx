
"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { QrCode, PlusCircle, CreditCard, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, increment } from "firebase/firestore";

const availableCodes = [
  '7aqtd566yud7p',
  'fgh3k9s8w2qaz',
  'p0oiu8y7t5rew',
  'mnb2v4c5x7z1q',
  'lkj7h5g4f6d3s'
];

export default function CodeBalancePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "Users", "default-user"), (doc) => {
      if (doc.exists()) {
        setBalance(doc.data().code_balance || 0);
      } else {
        setBalance(0);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleScan = () => {
    toast({
        title: "Scanner Ready",
        description: "QR code scanner for recharge would open now."
    })
  };

  const handleAddBalance = async () => {
      await updateDoc(doc(db, "Users", "default-user"), {
          code_balance: increment(5)
      });
      toast({
          title: "Balance Added",
          description: "Added 5 codes for demonstration."
      })
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
                        Add Demo
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
