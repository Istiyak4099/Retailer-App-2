
"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Home,
  CreditCard,
  LogOut,
  User,
  Bell,
  Youtube,
  Share2,
  Headset,
  Users,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const mainNavItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/customers", icon: Users, label: "Total Customers" },
  { href: "/balance", icon: CreditCard, label: "Balance Keys" },
  { href: "/onboarding", icon: User, label: "User Profile" },
  { href: "/installation-video", icon: Youtube, label: "Installation Video" },
  { href: "/contact-support", icon: Headset, label: "Contact Support" },
];


export function AppLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/login');
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "Logout Failed",
          description: data.error || "Could not log out. Please try again.",
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        variant: "destructive",
        title: "Logout Error",
        description: "An unexpected error occurred during logout.",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SidebarProvider>
        <Sidebar>
          <SidebarContent className="p-4">
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton
                      isActive={pathname.startsWith(item.href)}
                      tooltip={{ children: item.label, side: "right" }}
                      className="justify-start"
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-primary px-4 text-primary-foreground sm:px-6">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="text-primary-foreground hover:text-primary-foreground hover:bg-primary/80" />
                     <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground hover:text-primary-foreground hover:bg-primary/80" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Back</span>
                    </Button>
                    <h1 className="text-xl font-bold md:text-2xl">
                        {title}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground hover:text-primary-foreground hover:bg-primary/80">
                        <Bell className="h-5 w-5" />
                        <span className="sr-only">Notifications</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full text-primary-foreground hover:text-primary-foreground hover:bg-primary/80" 
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                    >
                        {isLoggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                        <span className="sr-only">Logout</span>
                    </Button>
                </div>
            </header>
            <div className="p-4 sm:px-6 sm:py-4">
                {children}
            </div>
        </SidebarInset>
    </SidebarProvider>
  );
}
