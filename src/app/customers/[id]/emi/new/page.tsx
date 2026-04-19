"use client";

import { useForm, useWatch } from "react-hook-form";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle, Loader2, CalendarIcon, UploadCloud } from "lucide-react";
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import { cn } from "@/lib/utils";

const fileSchema = z.any();

const formSchema = z.object({
  product_name: z.string().min(2, "Product name is required"),
  android_id: z.string().optional(),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  down_payment: z.coerce.number().default(0),
  installment_type: z.enum(["Weekly", "Monthly"]).default("Monthly"),
  number_of_emi: z.coerce.number().int().min(1, "At least 1 Installment is required"),
  date_of_next_payment: z.date({
    required_error: "Date of next payment is required.",
  }),
  emi_monthly_amount: z.coerce.number(),
  processing_fee: z.coerce.number().default(199),
  nid_front: fileSchema.optional(),
  nid_back: fileSchema.optional(),
  live_photo: fileSchema.optional(),
});

export default function NewEmiPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_name: "",
      android_id: "",
      price: 0,
      down_payment: 0,
      installment_type: "Monthly",
      number_of_emi: 6,
      processing_fee: 199,
      emi_monthly_amount: 0,
      nid_front: undefined,
      nid_back: undefined,
      live_photo: undefined,
    },
  });

  const price = useWatch({ control: form.control, name: 'price' });
  const down_payment = useWatch({ control: form.control, name: 'down_payment' });
  const number_of_emi = useWatch({ control: form.control, name: 'number_of_emi' });

  useEffect(() => {
    const p = Number(price) || 0;
    const dp = Number(down_payment) || 0;
    const n = Number(number_of_emi) || 1;
    let monthly = 0;
    if (n > 0) {
      monthly = (p - dp) / n;
    }
    form.setValue('emi_monthly_amount', isNaN(monthly) ? 0 : Math.round(monthly), { shouldValidate: true });
  }, [price, down_payment, number_of_emi, form]);

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
      const processing_fee = values.processing_fee || 199;
      const total_emi = price - down_payment + processing_fee;

      await addDoc(collection(db, "EmiDetails"), {
        customerId: id,
        product_name: values.product_name,
        android_id: values.android_id,
        price: price,
        processing_fee: processing_fee,
        down_payment: down_payment,
        installment_type: values.installment_type,
        number_of_emi: values.number_of_emi,
        date_of_next_payment: values.date_of_next_payment,
        emi_monthly_amount: values.emi_monthly_amount,
        total_emi: total_emi,
        nid_front: nidFrontUrl || "",
        nid_back: nidBackUrl || "",
        live_photo: livePhotoUrl || "",
        created_time: serverTimestamp(),
      });
      
      const customerDocRef = doc(db, "Customers", id);
      await updateDoc(customerDocRef, {
        status: "active",
        android_id: values.android_id
      });

      router.push(`/customers/${id}`);
    } catch (error) {
        console.error("Error creating EMI:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to create EMI plan." });
    }
  }

  return (
    <AppLayout title="New EMI Details">
      <Card className="max-w-2xl mx-auto shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>EMI Details (Step 2/2)</CardTitle>
          <CardDescription>
            Enter the financial details for the EMI plan.
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
                        <Input placeholder="e.g. Samsung Galaxy S24" {...field} />
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
                      <FormLabel>Price (BDT)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="down_payment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Down Payment (BDT)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="installment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Installment Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="number_of_emi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Installments</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 6" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date_of_next_payment"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-2.5">
                      <FormLabel className="mb-1.5">Date of Next Payment</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <FormField
                  control={form.control}
                  name="emi_monthly_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Installment Amount (Calculated)</FormLabel>
                      <FormControl>
                        <Input className="bg-muted font-bold" type="number" readOnly {...field} />
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
                        <Input className="bg-muted font-bold" type="number" readOnly {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        * This fee covers the digital key cost for device management; this amount is collected from the customer.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <div>
                  <FormLabel>Media Uploads</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <Button type="button" variant="outline" className="h-24 w-full flex-col gap-2" disabled title="This feature is coming soon">
                      <UploadCloud className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload NID Front</span>
                    </Button>
                    <Button type="button" variant="outline" className="h-24 w-full flex-col gap-2" disabled title="This feature is coming soon">
                      <UploadCloud className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload NID Back</span>
                    </Button>
                    <Button type="button" variant="outline" className="h-24 w-full flex-col gap-2" disabled title="This feature is coming soon">
                      <UploadCloud className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Take Live Photo</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Uploading documents feature will be available in an upcoming update.</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
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
