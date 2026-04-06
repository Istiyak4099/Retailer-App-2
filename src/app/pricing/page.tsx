"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CheckCircle, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [quantity, setQuantity] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const pricePerKey = 25;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setQuantity("");
    } else {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setQuantity(numValue);
      }
    }
  };

  const handlePurchase = async () => {
    if (!user || Number(quantity) < 5) return;

    setLoading(true);

    try {
      // In a real application, this would redirect to a Stripe Checkout session.
      // The backend would handle the successful payment via a webhook
      // and then update the user's balance.
      // For this prototype, we'll simulate the purchase directly.
      const retailerDocRef = doc(db, "Retailers", user.uid);
      await updateDoc(retailerDocRef, {
        key_balance: increment(Number(quantity))
      });
      
      toast({
        title: (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <span>Purchase Successful</span>
          </div>
        ),
        description: `You have successfully purchased ${quantity} keys.`,
      });

      router.push("/dashboard");

    } catch (error) {
      console.error("Error during simulated purchase:", error);
      toast({
        variant: "destructive",
        title: "Purchase Failed",
        description: "There was an error processing your purchase. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentQuantity = Number(quantity);
  const isValid = currentQuantity >= 5;
  const showMinPurchaseError = quantity !== '' && currentQuantity > 0 && currentQuantity < 5;
  const total = (currentQuantity * pricePerKey).toLocaleString();

  return (
    <AppLayout title="Purchase Keys">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg rounded-xl border-t-4 border-primary">
          <CardHeader className="text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-primary mb-4" />
            <CardTitle className="text-2xl">Purchase Activation Keys</CardTitle>
            <CardDescription>
              Add more keys to your balance to continue activating new customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-4xl font-bold">25 SAR</p>
              <p className="text-muted-foreground">per key</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <label htmlFor="quantity" className="text-sm font-medium">Quantity:</label>
              <Input 
                id="quantity"
                type="number"
                value={quantity}
                onChange={handleQuantityChange}
                placeholder="5"
                min="0"
                className="w-24 text-center"
              />
               <p className="text-lg font-bold whitespace-nowrap">
                Total: {total} SAR
              </p>
            </div>
             <p className="text-xs text-muted-foreground text-center">
                This is a simulated purchase flow. In a real app, this would integrate with a payment provider like Stripe.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2">
            {showMinPurchaseError && (
                <p className="text-sm text-destructive text-center">Minimum purchase is 5 keys.</p>
            )}
            <Button className="w-full h-12 text-base" onClick={handlePurchase} disabled={loading || !isValid}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
              Buy {isValid ? `${quantity} ` : ''}Keys
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
