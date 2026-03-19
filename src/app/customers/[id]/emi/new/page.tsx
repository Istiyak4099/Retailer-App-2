
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
import { useRouter, useParams } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

const fileSchema = z.any();

const formSchema = z.object({
  product_name: z.string().optional(),
  android_id: z.string().optional(),
  price: z.coerce.number().optional(),
  processing_fee: z.coerce.number().optional(),
  down_payment: z.coerce.number().optional(),
  number_of_emi: z.coerce.number().int().optional(),
  emi_monthly_amount: z.coerce.number().optional(),
  nid_front: fileSchema.optional(),
  nid_back: fileSchema.optional(),
  live_photo: fileSchema.optional(),
});

export default function NewEmiPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [nidFrontPreview, setNidFrontPreview] = useState<string | null>(null);
  const [nidBackPreview, setNidBackPreview] = useState<string | null>(null);
  const [livePhotoPreview, setLivePhotoPreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_name: "",
      android_id: "",
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

  useEffect(() => {
    if (!id) return;
    const fetchCustomer = async () => {
      try {
        const customerDocRef = doc(db, "Customers", id);
        const customerDoc = await getDoc(customerDocRef);
        if (customerDoc.exists()) {
          const customerData = customerDoc.data();
          if (customerData.android_id) {
            form.setValue('android_id', customerData.android_id);
          }
        }
      } catch (error) {
        console.error("Error fetching customer data for android_id", error);
      }
    };
    fetchCustomer();
  }, [id, form]);

  const uploadFile = async (fileList: FileList | undefined) => {
    if (!fileList || fileList.length === 0) return null;
    const file = fileList[0];
    const storageRef = ref(storage, `images/${uuidv4()}-${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const [nidFrontUrl, nidBackUrl, livePhotoUrl] = await Promise.all([
        uploadFile(values.nid_front),
        uploadFile(values.nid_back),
        uploadFile(values.live_photo)
      ]);

      const price = values.price || 0;
      const down_payment = values.down_payment || 0;
      const processing_fee = values.processing_fee || 0;
      const total_emi = price - down_payment + processing_fee;

      await addDoc(collection(db, "EmiDetails"), {
        customerId: id,
        product_name: values.product_name,
        android_id: values.android_id,
        price: price,
        processing_fee: processing_fee,
        down_payment: down_payment,
        number_of_emi: values.number_of_emi,
        emi_monthly_amount: values.emi_monthly_amount,
        total_emi: total_emi,
        nid_front: nidFrontUrl,
        nid_back: nidBackUrl,
        live_photo: livePhotoUrl,
        created_time: serverTimestamp(),
      });
      
      const customerDocRef = doc(db, "Customers", id);
      await updateDoc(customerDocRef, {
        status: "active",
        android_id: values.android_id
      });

      // EMI Created toast removed as requested
      router.push(`/customers/${id}`);
    } catch (error) {
        console.error("Error creating EMI:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to create EMI plan." });
    }
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="product_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. iPhone 15 Pro" {...field} />
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
                      <FormControl>
                        <Input placeholder="Device's Android ID" {...field} />
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
                <Button type="submit" disabled={form.formState.isSubmitting}>
                   {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create EMI Plan <CheckCircle className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
