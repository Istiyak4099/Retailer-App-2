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
import { Edit, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import GlobalLoading from "../loading";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  shop_owner_name: z.string().min(2, "Owner name is required"),
  mobile_number: z.string().min(10, "A valid WhatsApp/Mobile number is required"),
  shop_name: z.string().min(2, "Shop name is required"),
  shop_address: z.string().min(10, "Shop address is required"),
});

type FormData = z.infer<typeof formSchema>;

const DisplayRow = ({ label, value }: { label: string; value: string | undefined }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b last:border-0">
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:text-right">{value || 'N/A'}</dd>
  </div>
);

export default function OnboardingPage() {
  const { toast } = useToast();
  const { user, onboardingStatus, loading: authLoading } = useAuth();
  const [formLoading, setFormLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

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

  // When onboarding is completed, user should be in view mode by default.
  useEffect(() => {
    if (onboardingStatus === 'completed') {
      setIsEditing(false);
    }
  }, [onboardingStatus]);


  async function onSubmit(values: FormData) {
    if (!user) return;
    try {
      const userPayload = {
        ...values,
        uid: user.uid,
        email_address: user.email,
        isOnboarded: true,
      };

      await setDoc(doc(db, "Retailers", user.uid), userPayload, { merge: true });

      toast({
        title: "Profile Saved / تم حفظ الملف الشخصي",
        description: "Your information has been updated successfully.",
      });

      if (onboardingStatus === 'pending') {
        // Auth hook will redirect to dashboard
      } else {
        setIsEditing(false);
      }

    } catch (error) {
      console.error("Error saving profile: ", error);
      toast({
        variant: "destructive",
        title: "Error / خطأ",
        description: "Could not save your profile. Please try again.",
      });
    }
  }

  if (authLoading || formLoading || onboardingStatus === 'loading') {
    return <GlobalLoading />
  }

  const FormContent = (
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

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {onboardingStatus === 'pending'
              ? 'Complete Setup / إكمال الإعداد'
              : 'Save Profile / حفظ الملف الشخصي'}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (onboardingStatus === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-2xl shadow-xl border-t-4 border-primary">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl">
              Setup Your Retailer Profile
              <span dir="rtl" className="block mt-1">إعداد ملف التاجر الخاص بك</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            {FormContent}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Onboarding is completed, show profile view
  return (
    <AppLayout title="Retailer Profile / ملف التاجر">
      <Card className="max-w-2xl mx-auto shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>
            Complete Your Profile / <span dir="rtl">أكمل ملفك الشخصي</span>
          </CardTitle>
          <CardDescription>
            This information is required for your retailer account.
            / <span dir="rtl">هذه المعلومات المطلوبة لحساب التاجر الخاص بك.</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {FormContent}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
