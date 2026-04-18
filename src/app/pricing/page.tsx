"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShoppingCart, Shield, Zap } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function PricingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const pricePerKey = 199;

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
      // Get Firebase ID token for server-side verification
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Could not get authentication token. Please log in again.");
      }

      // Call our init payment API
      const response = await fetch("/api/payment/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ quantity: Number(quantity) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize payment.");
      }

      if (data.payment_url) {
        // Redirect to UddoktaPay payment page
        window.location.href = data.payment_url;
      } else {
        throw new Error("No payment URL received.");
      }
    } catch (error: any) {
      console.error("Error initiating payment:", error);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: error.message || "Failed to start payment. Please try again.",
      });
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
              <p className="text-4xl font-bold">199 BDT</p>
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
                Total: {total} ৳
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-green-500" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                <span>Instant Delivery</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2">
            {showMinPurchaseError && (
              <p className="text-sm text-destructive text-center">Minimum purchase is 5 keys.</p>
            )}
            <Button className="w-full h-12 text-base" onClick={handlePurchase} disabled={loading || !isValid}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
              {loading ? "Redirecting to Payment..." : `Buy ${isValid ? `${quantity} ` : ''}Keys`}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
