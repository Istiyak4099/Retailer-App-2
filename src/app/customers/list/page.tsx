"use client";

import { useSearchParams } from 'next/navigation'
import { AppLayout } from "@/components/app-layout";
import { CustomerTable } from "@/components/dashboard/customer-table";
import { Customer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle } from "lucide-react";
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect, useState, Suspense } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

function titleCase(str: string) {
  if (!str) return '';
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

function CustomersListPageContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const status = searchParams.get('status');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        let customerQuery = query(collection(db, 'Customers'), where('uid', '==', user.uid));
        
        if (status && status !== 'today') {
            customerQuery = query(customerQuery, where('status', '==', status));
        }
        
        const querySnapshot = await getDocs(customerQuery);
        let fetchedCustomers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));

        if (status === 'today') {
            const customerIds = fetchedCustomers.map(c => c.id);
            if (customerIds.length === 0) {
              setCustomers([]);
              setLoading(false);
              return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Firestore 'in' queries are limited to 30 items in the array.
            // For larger datasets, this would need a different approach.
            const emiQuery = query(
              collection(db, "EmiDetails"),
              where("customerId", "in", customerIds),
              where("created_time", ">=", Timestamp.fromDate(today)),
              where("created_time", "<", Timestamp.fromDate(tomorrow))
            );
            const emiSnapshot = await getDocs(emiQuery);
            const todaysCustomerIds = new Set(emiSnapshot.docs.map(doc => doc.data().customerId));

            fetchedCustomers = fetchedCustomers.filter(c => todaysCustomerIds.has(c.id));
        }

        setCustomers(fetchedCustomers);

      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [status, user]);

  let pageTitle = status ? `${titleCase(status)} Customers` : "All Customers";
  let pageDescription = status ? `A list of your customers with status: ${titleCase(status)}` : "Here's a list of all your EMI customers.";

  if (status === 'today') {
    pageTitle = "Today's Activations";
    pageDescription = "A list of customers activated today.";
  }

  return (
    <AppLayout title={pageTitle}>
      <div className="space-y-4">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{pageTitle}</h2>
            <p className="text-muted-foreground">
              {pageDescription}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/customers/new" passHref>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New EMI
              </Button>
            </Link>
          </div>
        </div>
        <Card className="shadow-lg rounded-xl">
            <CardHeader>
                <CardTitle>Customers</CardTitle>
                <CardDescription>Manage your customers and view their EMI status.</CardDescription>
            </CardHeader>
            <CardContent>
                 {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                 ) : (
                    <CustomerTable customers={customers} />
                 )}
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}


export default function CustomersListPage() {
    return (
        <Suspense fallback={
            <AppLayout title="Loading...">
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AppLayout>
        }>
            <CustomersListPageContent />
        </Suspense>
    )
}
