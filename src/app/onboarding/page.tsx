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
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Building, Loader2, Mail, MapPin, Phone, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
  shop_owner_name: z.string().min(2, "Owner name is required"),
  mobile_number: z.string().min(10, "A valid WhatsApp/Mobile number is required"),
  shop_name: z.string().min(2, "Shop name is required"),
  shop_address: z.string().min(10, "Shop address is required"),
});

type FormData = z.infer<typeof formSchema>;


export default function OnboardingPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [formLoading, setFormLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shop_owner_name: "",
      mobile_number: "",
      shop_name: "",
      shop_address: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      setFormLoading(true);
      const userDocRef = doc(db, "Retailers", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const fetchedData = userDoc.data();
        form.reset({
          shop_owner_name: fetchedData.shop_owner_name || user.displayName || "",
          mobile_number: fetchedData.mobile_number || user.phoneNumber || "",
          shop_name: fetchedData.shop_name || "",
          shop_address: fetchedData.shop_address || "",
        });
      } else {
         form.reset({
          shop_owner_name: user.displayName || "",
          mobile_number: user.phoneNumber || "",
          shop_name: "",
          shop_address: ""
        });
      }
      setFormLoading(false);
    };
    fetchUserData();
  }, [user, form]);


  async function onSubmit(values: FormData) {
    if (!user) return;
    try {
      const userPayload = {
        ...values,
        uid: user.uid,
        email_address: user.email, // Ensure email from auth is source of truth
        is_riba_free_compliant: true, // Re-affirm compliance
      };

      await setDoc(doc(db, "Retailers", user.uid), userPayload, { merge: true });
      
      toast({
        title: "Profile Saved / تم حفظ الملف الشخصي",
        description: "Your information has been updated successfully.",
      });

    } catch (error) {
      console.error("Error saving profile: ", error);
      toast({
        variant: "destructive",
        title: "Error / خطأ",
        description: "Could not save your profile. Please try again.",
      });
    }
  }
  
  if (authLoading || formLoading) {
    return (
      <AppLayout title="Loading Profile...">
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  return (
      <AppLayout title="Retailer Profile / ملف التاجر">
      <Card className="max-w-2xl mx-auto shadow-lg rounded-xl">
          <CardHeader>
          <CardTitle>
            Complete Your Profile / <span dir="rtl">أكمل ملفك الشخصي</span>
          </CardTitle>
          <CardDescription>
            This information is required for your retailer account.
            / <span dir="rtl">هذه المعلومات مطلوبة لحساب التاجر الخاص بك.</span>
          </CardDescription>
          </CardHeader>
          <CardContent>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="shop_owner_name"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Shop Owner Name / <span dir="rtl">اسم صاحب المحل</span></FormLabel>
                      <FormControl>
                          <Input placeholder="e.g. John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="shop_name"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Shop Name / <span dir="rtl">اسم المحل</span></FormLabel>
                      <FormControl>
                      <Input placeholder="e.g. The Gadget Store" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
                <FormField
                  control={form.control}
                  name="shop_address"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Shop Address / <span dir="rtl">عنوان المحل</span></FormLabel>
                      <FormControl>
                      <Input placeholder="Full shop address" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
               <FormField
                control={form.control}
                name="mobile_number"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>WhatsApp/Mobile Number / <span dir="rtl">رقم الواتساب/الجوال</span></FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. 01700000000" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormItem>
                    <FormLabel>Email Address / <span dir="rtl">البريد الإلكتروني</span></FormLabel>
                    <FormControl>
                        <Input type="email" value={user?.email || ""} disabled />
                    </FormControl>
                </FormItem>

              <div className="flex justify-end">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profile / <span dir="rtl">حفظ الملف الشخصي</span>
                  </Button>
              </div>
              </form>
          </Form>
          </CardContent>
      </Card>
      </AppLayout>
  );
}
