
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, QrCode, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  full_name: z.string().optional(),
  mobile_number: z.string().optional(),
  email_address: z.string().email("Invalid email address").optional().or(z.literal('')),
  android_id: z.string().optional(),
  address: z.string().optional(),
});

export default function NewCustomerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      mobile_number: "",
      email_address: "",
      android_id: "",
      address: "",
    },
  });

  useEffect(() => {
    let html5QrCode: Html5Qrcode;

    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          html5QrCode = new Html5Qrcode("qr-reader");
          const qrCodeSuccessCallback = (decodedText: string) => {
            form.setValue("android_id", decodedText);
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              // QR Code Scan toast removed as requested
            });
          };

          const config = { fps: 10, qrbox: { width: 250, height: 250 } };
          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            qrCodeSuccessCallback,
            undefined
          );
          setHasCameraPermission(true);
        }
      } catch (err) {
        console.error("Scanner Error:", err);
        setHasCameraPermission(false);
      }
    };

    if (isScanning) {
      startScanner();
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isScanning, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const docRef = await addDoc(collection(db, "Customers"), {
        ...values,
        status: "pending",
      });
      // Customer Added toast removed as requested
      router.push(`/customers/${docRef.id}/emi/new`);
    } catch (error) {
      console.error("Error adding customer: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to add customer. Please try again." });
    }
  }

  return (
    <AppLayout title="New Customer Onboarding">
      <Card className="max-w-2xl mx-auto shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Customer Details (Step 1/2)</CardTitle>
          <CardDescription>
            Enter the customer&apos;s personal and device information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Priya Patel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="mobile_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input placeholder="11-digit mobile number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="email_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="name@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Customer's full address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="android_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Android ID</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="Device's Android ID" {...field} />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setIsScanning(true)}
                        title="Scan QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormDescription>
                      You can enter the ID manually or scan the device&apos;s QR code.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                 <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Next: EMI Details <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={isScanning} onOpenChange={setIsScanning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Android ID</DialogTitle>
            <DialogDescription>
              Point your camera at the QR code displayed on the target device.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <div id="qr-reader" className="w-full overflow-hidden rounded-lg border bg-black aspect-square" />
            {hasCameraPermission === false && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please enable camera permissions in your browser settings to use the scanner.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="secondary" onClick={() => setIsScanning(false)}>
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
