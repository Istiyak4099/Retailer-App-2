
"use client";

import { AppLayout } from "@/components/app-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Customer, EmiDetails } from "@/lib/types";
import {
  Lock,
  Unlock,
  Trash2,
  BellRing,
  MapPin,
  Phone,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserMinus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, updateDoc, where, addDoc, serverTimestamp, increment } from "firebase/firestore";
import { format, addMonths, addWeeks } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { useAuth } from "@/hooks/use-auth";

const InfoRow = ({ label, value }: { label: string; value: string | number | undefined | null }) => (
  <div className="flex justify-between py-2 border-b last:border-0">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="font-semibold text-right">{value || 'N/A'}</dd>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-lg font-semibold mt-4 mb-2 text-primary border-l-4 border-primary pl-2">{children}</h3>
);

export default function CustomerDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [emiDetails, setEmiDetails] = useState<EmiDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    const fetchCustomerData = async () => {
      setLoading(true);
      try {
        const customerDocRef = doc(db, "Customers", id);
        const customerDoc = await getDoc(customerDocRef);

        if (customerDoc.exists() && customerDoc.data().uid === user.uid) {
          const customerData = { id: customerDoc.id, ...customerDoc.data() } as Customer;
          setCustomer(customerData);

          const q = query(collection(db, "EmiDetails"), where("customerId", "==", id));
          const emiQuerySnapshot = await getDocs(q);
          if (!emiQuerySnapshot.empty) {
            const emiDoc = emiQuerySnapshot.docs[0];
            const emiData = emiDoc.data();
            
            const createdTime = emiData.created_time && emiData.created_time.toDate 
              ? emiData.created_time.toDate() 
              : new Date();

            setEmiDetails({ 
              id: emiDoc.id, 
              ...emiData,
              created_time: createdTime
            } as EmiDetails);
          }
        } else {
          notFound();
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
         toast({ variant: "destructive", title: "Error", description: "Could not fetch customer data." });
      } finally {
        setLoading(false);
      }
    };
    fetchCustomerData();
  }, [id, toast, user]);
  
  const handleUpdateStatus = async (newStatus: Customer['status']) => {
    if (!customer) return;
    setIsUpdating(true);
    
    const customerDocRef = doc(db, "Customers", customer.id);
    const updateData = { status: newStatus };

    updateDoc(customerDocRef, updateData)
      .then(async () => {
        setCustomer(prev => prev ? { ...prev, status: newStatus } : null);
        
        let toastMessage = `Customer status changed to ${newStatus}.`;
        let toastTitle = "Status Updated";
        let Icon = CheckCircle2;
        let iconColor = "text-green-500";
        
        if (newStatus === 'locked') {
          toastTitle = "Device Locked";
          toastMessage = "Command executed successfully.";
          Icon = Lock;
          iconColor = "text-red-500";
        } else if (newStatus === 'unlocked') {
          toastTitle = "Device Unlocked";
          toastMessage = "Command executed successfully.";
          Icon = Unlock;
          iconColor = "text-green-500";
        }

        toast({
            title: (
              <div className="flex flex-col items-center gap-2">
                <Icon className={`h-10 w-10 ${iconColor}`} />
                <span>{toastTitle}</span>
              </div>
            ),
            description: toastMessage,
        });

        if (newStatus === "removed") {
            router.push('/customers/list?status=removed');
        }
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: customerDocRef.path,
          operation: 'update',
          requestResourceData: updateData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  const handleSendReminder = async () => {
    if (!customer || !user) return;
    const targetAndroidId = emiDetails?.android_id || customer.android_id;
    if (!targetAndroidId) {
      toast({
        variant: "destructive",
        title: (
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <span>Missing ID</span>
          </div>
        ),
        description: "Cannot send reminder without a valid Android ID.",
      });
      return;
    }

    setIsSendingReminder(true);
    const notificationData = {
      android_id: targetAndroidId,
      customerId: customer.id,
      retailerId: user.uid,
      type: 'payment_reminder',
      message: 'Please pay your pending EMI to avoid device lock.',
      status: 'pending',
      created_at: serverTimestamp(),
    };

    addDoc(collection(db, "Notifications"), notificationData)
      .then(() => {
        toast({
          title: (
            <div className="flex flex-col items-center gap-2">
              <BellRing className="h-10 w-10 text-blue-500" />
              <span>Reminder Sent</span>
            </div>
          ),
          description: `Command sent to device: ${targetAndroidId}`,
        });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'Notifications',
          operation: 'create',
          requestResourceData: notificationData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSendingReminder(false);
      });
  };

  const handleLogPayment = async () => {
    if (!emiDetails || !user) return;
    if (emiDetails.number_of_emi <= 0) {
      toast({ variant: "destructive", title: "Wait", description: "All installments have been marked as paid." });
      return;
    }
    
    setIsLoggingPayment(true);
    try {
      const currentNextDate = emiDetails.date_of_next_payment.toDate 
        ? emiDetails.date_of_next_payment.toDate() 
        : new Date(emiDetails.date_of_next_payment);
      
      const newNextDate = emiDetails.installment_type === 'Weekly' 
        ? addWeeks(currentNextDate, 1) 
        : addMonths(currentNextDate, 1);

      const emiDocRef = doc(db, "EmiDetails", emiDetails.id);
      await updateDoc(emiDocRef, {
        number_of_emi: increment(-1),
        date_of_next_payment: newNextDate
      });
      
      setEmiDetails(prev => prev ? { 
        ...prev, 
        number_of_emi: prev.number_of_emi - 1,
        date_of_next_payment: newNextDate
      } : null);
      
      toast({
        title: (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <span>Payment Logged</span>
          </div>
        ),
        description: `Installment decremented. Next payment: ${format(newNextDate, 'PP')}`,
      });
    } catch (error) {
      console.error("Error logging payment:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to log payment." });
    } finally {
      setIsLoggingPayment(false);
    }
  };


  if (loading) {
    return (
      <AppLayout title="Customer Details">
         <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  if (!customer) {
    return notFound();
  }
  
  const getStatusVariant = (
    status: Customer['status']
  ): "default" | "destructive" | "secondary" => {
    switch (status) {
      case "active":
      case "unlocked":
        return "default";
      case "locked":
        return "destructive";
      case "completed":
      case "pending":
      case "removed":
        return "secondary";
      default:
        return "default";
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };
  
  const ActionButton = ({ status, title, description, buttonText, variant, icon: Icon, className }: { status: Customer['status'], title: string, description: string, buttonText: string, variant: Button['variant'], icon: React.ElementType, className?: string }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} className={className} disabled={isUpdating}>
          {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
          {buttonText}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleUpdateStatus(status)} className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground' : ''}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <AppLayout title="Customer Details">
      <div className="max-w-2xl mx-auto pb-10">
        <Card className="shadow-lg rounded-xl overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="bg-muted/30 p-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16 text-xl border-2 border-primary">
                <AvatarImage src={emiDetails?.live_photo || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {getInitials(customer.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl md:text-2xl">{customer.full_name}</CardTitle>
                    <Badge variant={getStatusVariant(customer.status)} className="ml-auto uppercase text-[10px]">
                      {customer.status}
                    </Badge>
                </div>
                <div className="flex items-center text-muted-foreground mt-1 text-sm">
                    <Phone className="h-3 w-3 mr-2 text-primary" />
                    <p>{customer.mobile_number}</p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 md:p-6 space-y-4">
            <dl className="text-sm">
              <SectionTitle>Device Information</SectionTitle>
              <InfoRow label="Android ID" value={emiDetails?.android_id || customer.android_id} />

              <SectionTitle>Loan Information</SectionTitle>
              <InfoRow label="Product Price" value={emiDetails?.price ? `${emiDetails.price.toLocaleString()} BDT`: 'N/A'} />
              <InfoRow label="Processing Fee" value={emiDetails?.processing_fee ? `${emiDetails.processing_fee.toLocaleString()} BDT` : 'N/A'} />
              <InfoRow label="Down Payment" value={emiDetails?.down_payment ? `${emiDetails.down_payment.toLocaleString()} BDT` : 'N/A'} />
              <InfoRow label="Total Value" value={emiDetails?.total_emi ? `${emiDetails.total_emi.toLocaleString()} BDT` : 'N/A'} />
              <InfoRow label="Installment Type" value={emiDetails?.installment_type || 'N/A'} />
              <InfoRow label="Installment Amount" value={emiDetails?.emi_monthly_amount ? `${emiDetails.emi_monthly_amount.toLocaleString()} BDT` : 'N/A'} />
              <div className="flex justify-between py-2 border-b items-center last:border-0">
                <dt className="text-muted-foreground">Remaining Installments</dt>
                <div className="flex items-center gap-4">
                  <dd className="font-semibold">{emiDetails?.number_of_emi !== undefined ? emiDetails.number_of_emi : 'N/A'}</dd>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs border-primary text-primary" disabled={!emiDetails || emiDetails.number_of_emi <= 0 || isLoggingPayment}>
                        {isLoggingPayment ? <Loader2 className="mr-1 h-3 w-3 animate-spin"/> : null}
                        Log Payment
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Log Payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark 1 installment as paid and decrement the remaining counter.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogPayment}>Confirm</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <InfoRow label="Next Payment Date" value={emiDetails?.date_of_next_payment ? format(emiDetails.date_of_next_payment.toDate ? emiDetails.date_of_next_payment.toDate() : new Date(emiDetails.date_of_next_payment), 'PP') : 'N/A'} />
              <InfoRow label="Loan ID" value={emiDetails?.id} />
              <InfoRow label="Activation Date" value={emiDetails?.created_time ? format(emiDetails.created_time, 'PP') : 'N/A'} />


              <SectionTitle>Personal Information</SectionTitle>
              <InfoRow label="Address" value={customer.address} />
              <InfoRow label="Mobile Number" value={customer.mobile_number} />
              <InfoRow label="Email" value={customer.email_address} />
            </dl>

            <Separator />
            
            {emiDetails && (emiDetails.nid_front || emiDetails.nid_back || emiDetails.live_photo) && (
              <>
                <SectionTitle>Uploaded Documents</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                    {emiDetails.nid_front && (
                      <div className="space-y-1 text-center">
                          <Image src={emiDetails.nid_front} alt="NID Front" width={150} height={100} className="rounded-md w-full object-cover h-24 border" data-ai-hint="document photo" />
                          <p className="text-[10px] text-muted-foreground">NID Front</p>
                      </div>
                    )}
                    {emiDetails.nid_back && (
                      <div className="space-y-1 text-center">
                          <Image src={emiDetails.nid_back} alt="NID Back" width={150} height={100} className="rounded-md w-full object-cover h-24 border" data-ai-hint="document photo" />
                          <p className="text-[10px] text-muted-foreground">NID Back</p>
                      </div>
                    )}
                    {emiDetails.live_photo && (
                      <div className="space-y-1 text-center">
                          <Image src={emiDetails.live_photo} alt="Live Photo" width={150} height={100} className="rounded-md w-full object-cover h-24 border" data-ai-hint="person selfie" />
                          <p className="text-[10px] text-muted-foreground">Live Photo</p>
                      </div>
                    )}
                </div>
              </>
            )}
            
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2 mt-6">
            <ActionButton
              status="locked"
              title="Confirm Device Lock"
              description="This will instantly lock the customer's device."
              buttonText="Lock"
              variant="destructive"
              icon={Lock}
              className="w-full h-12 text-base font-bold"
            />
             <ActionButton
              status="unlocked"
              title="Confirm Device Unlock"
              description="This will instantly unlock the customer's device."
              buttonText="Unlock"
              variant="secondary"
              icon={Unlock}
              className="bg-green-600 hover:bg-green-700 text-white w-full h-12 text-base font-bold"
            />
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-base font-bold border-primary text-primary hover:bg-primary/10" 
                  disabled={isSendingReminder}
                >
                  {isSendingReminder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                  Send Reminder
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send Payment Reminder?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send a notification command to the target device.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSendReminder}>
                    Send
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Link href={`/customers/${id}/location`} passHref className="w-full">
              <Button variant="outline" className="w-full h-12 text-base font-bold border-blue-500 text-blue-500 hover:bg-blue-500/10">
                <MapPin className="mr-2 h-4 w-4" />Track
              </Button>
            </Link>

            <ActionButton
              status="removed"
              title="Confirm Customer Removal"
              description="This will remove the customer and release the device from control. This cannot be undone."
              buttonText="Remove Device"
              variant="outline"
              icon={Trash2}
              className="w-full h-12 text-base font-bold col-span-2 mt-2"
            />
        </div>
      </div>
    </AppLayout>
  );
}
