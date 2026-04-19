"use client"

import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  KeyRound,
  UserPlus,
  QrCode,
  Users,
  ChevronRight,
  UserCircle,
  Youtube,
  Headset,
  Hourglass,
  Lock,
  Unlock,
  Trash2,
  CheckCircle,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, onSnapshot, doc } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";

const StatCard = ({ icon: Icon, title, value, iconColor, href, loading }: { icon: React.ElementType, title: string, value: string | number, iconColor?: string, href: string, loading?: boolean }) => (
  <Link href={href} passHref className="h-full">
    <Card className="text-center shadow-md h-full hover:bg-muted/50 transition-colors border-primary/10">
      <CardContent className="p-3 flex flex-col items-center justify-center h-full">
        <Icon className={cn("h-7 w-7 mb-1", iconColor || "text-primary")} />
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <p className="text-xl font-bold">{value}</p>}
        <p className="text-[10px] text-muted-foreground uppercase font-semibold text-center leading-tight">{title}</p>
      </CardContent>
    </Card>
  </Link>
);

const ListItem = ({ icon: Icon, title, value, href, loading }: { icon: React.ElementType, title: string, value?: string | number, href: string, loading?: boolean }) => (
  <Link href={href} passHref>
    <Card className="shadow-sm hover:shadow-md transition-shadow border-none bg-muted/30">
      <CardContent className="p-4 flex items-center">
        <Icon className="h-6 w-6 text-primary mr-4" />
        <div className="flex-grow">
          <p className="font-semibold text-sm">{title}</p>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : value !== undefined && <p className="text-muted-foreground text-xs">{value}</p>}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </CardContent>
    </Card>
  </Link>
)

export default function DashboardPage() {
  const { user } = useAuth();
  const [retailer, setRetailer] = useState<any>(null);
  const [stats, setStats] = useState({
    today: 0,
    active: 0,
    balance: 0,
    pending: 0,
    locked: 0,
    unlocked: 0,
    removed: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const q = query(collection(db, 'Customers'), where("uid", "==", user.uid));

    const unsubscribeCustomers = onSnapshot(q, (snapshot) => {
      let active = 0, pending = 0, locked = 0, unlocked = 0, removed = 0, total = 0;

      snapshot.forEach((doc) => {
        const customer = doc.data();
        total++;
        switch (customer.status) {
          case 'active':
          case 'unlocked':
            active++;
            break;
          case 'pending': pending++; break;
          case 'locked': locked++; break;
          case 'removed': removed++; break;
        }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const emiQuery = query(
        collection(db, "EmiDetails"),
        where("customerId", "in", snapshot.docs.map(d => d.id).length > 0 ? snapshot.docs.map(d => d.id) : ['dummy-id']),
        where("created_time", ">=", Timestamp.fromDate(today)),
        where("created_time", "<", Timestamp.fromDate(tomorrow))
      );

      getDocs(emiQuery).then((emiSnapshot) => {
        const todaysActivations = emiSnapshot.size;
        setStats(prev => ({
          ...prev,
          today: todaysActivations,
          active,
          pending,
          locked,
          unlocked,
          removed,
          total
        }));
        setLoading(false);
      });
    }, (error) => {
      console.error("Error fetching stats:", error);
      setLoading(false);
    });

    const unsubscribeUser = onSnapshot(doc(db, "Retailers", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const retailerData = docSnap.data();
        setRetailer(retailerData);
        setStats(prev => ({ ...prev, balance: retailerData.key_balance || 0 }));
      } else {
        // New user, redirect to onboarding to create profile
        // This might be handled in useAuth or a different place too
      }
    });

    return () => {
      unsubscribeCustomers();
      unsubscribeUser();
    };
  }, [user]);

  const statCards = [
    { icon: CheckCircle, title: "Today Activation", value: stats.today, iconColor: "text-blue-500", href: "/customers/list?status=today" },
    { icon: Users, title: "Active Devices", value: stats.active, href: "/customers/list?status=active" },
    { icon: Users, title: "Total Customers", value: stats.total, iconColor: "text-purple-500", href: "/customers" },
    { icon: KeyRound, title: "Key Balance", value: stats.balance, href: "/balance" },
    { icon: Lock, title: "Locked Devices", value: stats.locked, iconColor: "text-red-500", href: "/customers/list?status=locked" },
    { icon: Trash2, title: "Removed Devices", value: stats.removed, href: "/customers/list?status=removed" },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">Welcome, {user?.displayName}</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {statCards.map((card, index) => (
            <StatCard key={index} {...card} loading={loading} />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/customers/new" passHref>
            <Button className="w-full h-12 text-base font-semibold shadow-lg">
              <UserPlus className="mr-2 h-5 w-5" />
              Add Customer
            </Button>
          </Link>
          <Link href="/pricing" passHref>
            <Button className="w-full h-12 text-base font-semibold shadow-lg" variant="secondary">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Buy Keys
            </Button>
          </Link>
          <Link href="/install" passHref>
            <Button className="w-full h-12 text-base font-semibold shadow-lg" variant="outline">
              <QrCode className="mr-2 h-5 w-5" />
              Setup Device
            </Button>
          </Link>
        </div>

        <div className="space-y-2 pt-2">
          <ListItem icon={UserCircle} title="User Profile" href="/onboarding" />
          <ListItem icon={Youtube} title="Installation Video" href="#" />
          <ListItem icon={Headset} title="Contact Support" href="#" />
        </div>
      </div>
    </AppLayout >
  );
}