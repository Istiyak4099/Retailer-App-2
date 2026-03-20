"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, AlertCircle, XCircle } from "lucide-react";
import { useState, Suspense } from "react";
import Image from "next/image";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TEST_UID = "test-retailer-123";

const fileSchema = z.any();

const formSchema = z.object({
  product_name: z.string().min(2, "Product name is required"),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  processing_fee: z.coerce.number().optional(),
  down_payment: z.coerce.number().optional(),
  number_of_emi: z.coerce.number().int().min(1, "At least 1 EMI is required"),
  emi_monthly_amount: z.coerce.number().min(1, "Monthly EMI is required"),
  nid_front: fileSchema.optional(),
  nid_back: fileSchema.optional(),
  live_photo: fileSchema.optional(),
});

function NewEmiPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nidFrontPreview, setNidFrontPreview] = useState<string | null>(null);
  const [nidBackPreview, setNidBackPreview] = useState<string | null>(null);
  const [livePhotoPreview, setLivePhotoPreview] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formValues, setFormValues] = useState<z.infer<typeof formSchema> | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_name: "",
      price: 0,
      processing_fee: 0,
      down_payment: 0,
      number_of_emi: 6,
      emi_monthly_amount: 0,
      nid_front: undefined,
      nid_back: undefined,
      live_photo: undefined,
    },
  });

  const uploadFile = async (fileList: FileList | undefined) => {
    if (!fileList || fileList.length === 0) return null;
    const file = fileList[0];
    const storageRef = ref(storage, `images/${uuidv4()}-${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const checkBalance = async () => {
    const userDocRef = doc(db, "Retailers", TEST_UID);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) return 0;
    return userDoc.data().key_balance || 0;
  };

  async function handleFinalSubmit() {
    if (!formValues) return;
    
    try {
      // 1. Check Balance
      const balance = await checkBalance();
      if (balance <= 0) {
        toast({
          variant: "destructive",
          title: (
            <div className="flex flex-col items-center gap-2">
              <XCircle className="h-10 w-10 text-white" />
              <span>Insufficient Balance</span>
            </div>
          ),
          description: "You do not have enough activation codes to create this profile. Please recharge.",
        });
        setIsConfirmOpen(false);
        return;
      }

      // 2. Start Uploads
      const [nidFrontUrl, nidBackUrl, livePhotoUrl] = await Promise.all([
        uploadFile(formValues.nid_front),
        uploadFile(formValues.nid_back),
        uploadFile(formValues.live_photo)
      ]);

      const price = formValues.price || 0;
      const down_payment = formValues.down_payment || 0;
      const processing_fee = formValues.processing_fee || 0;
      const total_emi = price - down_payment + processing_fee;

      // 3. Create Customer
      const customerData = {
        full_name: searchParams.get('full_name'),
        mobile_number: searchParams.get('mobile_number'),
        email_address: searchParams.get('email_address') || "",
        android_id: searchParams.get('android_id'),
        address: searchParams.get('address'),
        status: "active" as const,
        uid: TEST_UID,
      };

      const customerRef = await addDoc(collection(db, "Customers"), customerData);

      // 4. Create EMI Details
      await addDoc(collection(db, "EmiDetails"), {
        customerId: customerRef.id,
        product_name: formValues.product_name,
        android_id: customerData.android_id,
        price: price,
        processing_fee: processing_fee,
        down_payment: down_payment,
        number_of_emi: formValues.number_of_emi,
        emi_monthly_amount: formValues.emi_monthly_amount,
        total_emi: total_emi,
        nid_front: nidFrontUrl,
        nid_back: nidBackUrl,
        live_photo: livePhotoUrl,
        created_time: serverTimestamp(),
      });
      
      // 5. Deduct Balance
      await updateDoc(doc(db, "Retailers", TEST_UID), {
        key_balance: increment(-1)
      });

      router.push(`/customers/${customerRef.id}`);
    } catch (error) {
        console.error("Error creating EMI:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to finalize activation." });
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    setFormValues(values);
    setIsConfirmOpen(true);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setter(null);
    }
  };

  return (
    <AppLayout title="New EMI Details">
      <Card className="max-w-2xl mx-auto shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>EMI Details (Step 2/2)</CardTitle>
          <CardDescription>
            Enter the financial details for the EMI plan and upload required documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                 <FormField
                  control={form.control}
                  name="product_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Samsung Galaxy S24" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
             
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="processing_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Processing Fee</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField
                  control={form.control}
                  name="down_payment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Down Payment</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="number_of_emi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of EMIs</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 6" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emi_monthly_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly EMI</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="nid_front"
                  render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                      <FormLabel>NID Front Side</FormLabel>
                      {nidFrontPreview && (
                         <Image src={nidFrontPreview} alt="NID Front Preview" width={300} height={200} className="rounded-lg w-full object-contain h-48" />
                      )}
                      <FormControl>
                        <Input type="file" {...rest} onChange={(e) => {
                            onChange(e.target.files);
                            handleFileChange(e, setNidFrontPreview);
                        }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nid_back"
                  render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                      <FormLabel>NID Back Side</FormLabel>
                      {nidBackPreview && (
                         <Image src={nidBackPreview} alt="NID Back Preview" width={300} height={200} className="rounded-lg w-full object-contain h-48" />
                      )}
                      <FormControl>
                         <Input type="file" {...rest} onChange={(e) => {
                            onChange(e.target.files);
                            handleFileChange(e, setNidBackPreview);
                         }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="live_photo"
                  render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                      <FormLabel>Customer's Live Photo</FormLabel>
                      {livePhotoPreview && (
                         <Image src={livePhotoPreview} alt="Live Photo Preview" width={300} height={200} className="rounded-lg w-full object-contain h-48" />
                      )}
                      <FormControl>
                        <Input type="file" accept="image/*" capture="user" {...rest} onChange={(e) => {
                            onChange(e.target.files);
                            handleFileChange(e, setLivePhotoPreview);
                        }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit">
                  Create EMI Plan <CheckCircle className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Activation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate this customer profile? One activation code will be used from your balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalSubmit} className="bg-primary text-primary-foreground">
              Confirm & Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

export default function NewEmiPage() {
  return (
    <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin mx-auto mt-20" />}>
      <NewEmiPageContent />
    </Suspense>
  )
}
