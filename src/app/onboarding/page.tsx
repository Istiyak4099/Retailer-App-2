
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
import { Building, Loader2, Mail, MapPin, Phone, User as UserIcon, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { User } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  shop_owner_name: z.string().min(2, "Owner name is required"),
  mobile_number: z.string().regex(/^\d{11}$/, "Invalid 11-digit mobile number"),
  shop_name: z.string().min(2, "Shop name is required"),
  shop_address: z.string().min(10, "Shop address is required"),
});

type FormData = z.infer<typeof formSchema>;

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number | undefined | null }) => (
    <div className="flex items-start py-3">
        <Icon className="h-5 w-5 text-primary mr-4 mt-1" />
        <div>
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="font-semibold">{value || 'N/A'}</p>
        </div>
    </div>
);

const staticUserId = "default-user";

export default function OnboardingPage() {
  const { toast } = useToast();
  const [userData, setUserData] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(true);

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
    const fetchUserData = async () => {
      setLoading(true);
      const userDocRef = doc(db, "Users", staticUserId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const fetchedData = userDoc.data() as Omit<User, 'uid'>;
        setUserData({ ...fetchedData, uid: staticUserId });
        form.reset(fetchedData);
        setIsNewUser(false);
      } else {
         form.reset({
          shop_owner_name: "Test User",
          mobile_number: "",
          shop_name: "",
          shop_address: ""
        });
        setIsNewUser(true);
      }
      setLoading(false);
    };
    fetchUserData();
  }, [form]);


  async function onSubmit(values: FormData) {
    try {
      const userPayload = {
        ...values,
        email_address: "testuser@example.com",
        code_balance: isNewUser ? 5 : userData?.code_balance || 0, // Initialize with 5 codes for new users
      };

      await setDoc(doc(db, "Users", staticUserId), userPayload, { merge: true });
      
      const updatedUserData = await getDoc(doc(db, "Users", staticUserId));
      setUserData({ uid: staticUserId, ...(updatedUserData.data() as Omit<User, 'uid'>) });
      setIsNewUser(false);

    } catch (error) {
      console.error("Error saving profile: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save your profile. Please try again.",
      });
    }
  }
  
  if (loading) {
    return (
      <AppLayout title="Loading Profile...">
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  if (isNewUser) {
    return (
        <AppLayout title="Retailer Onboarding">
        <Card className="max-w-2xl mx-auto shadow-lg rounded-xl">
            <CardHeader>
            <CardTitle>Welcome! Complete Your Profile</CardTitle>
            <CardDescription>
                This information is needed to set up your retailer account.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="shop_owner_name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Shop Owner Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. John Doe" {...field} />
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
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                            <Input placeholder="11-digit mobile number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                        <Input type="email" value="testuser@example.com" disabled />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                <FormField
                    control={form.control}
                    name="shop_name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Shop Name</FormLabel>
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
                        <FormLabel>Shop Address</FormLabel>
                        <FormControl>
                        <Input placeholder="Full shop address" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save and Continue
                    </Button>
                </div>
                </form>
            </Form>
            </CardContent>
        </Card>
        </AppLayout>
    );
  }

  return (
    <AppLayout title="User Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="shadow-lg rounded-xl">
            <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={undefined} alt="User Profile" />
                    <AvatarFallback>
                        <UserIcon className="h-8 w-8" />
                    </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl text-primary mb-0">Personal Information</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Separator className="mb-4" />
                <InfoRow icon={UserIcon} label="Dealer Name" value={userData?.shop_owner_name} />
                <Separator />
                <InfoRow icon={Phone} label="Mobile Number" value={userData?.mobile_number} />
                <Separator />
                <InfoRow icon={Mail} label="Email Address" value={userData?.email_address} />
            </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl">
            <CardHeader className="flex flex-row items-center gap-4">
                <Building className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl text-primary mb-0">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                 <Separator className="mb-4" />
                <InfoRow icon={Building} label="Shop Name" value={userData?.shop_name} />
                <Separator />
                <InfoRow icon={MapPin} label="Address" value={userData?.shop_address} />
                <Separator />
                <InfoRow icon={CreditCard} label="Code Balance" value={userData?.code_balance} />
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
