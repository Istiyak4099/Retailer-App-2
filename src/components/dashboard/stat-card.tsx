import React from "react";
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  iconColor?: string;
  href: string;
  loading?: boolean;
}

export function StatCard({ icon: Icon, title, value, iconColor, href, loading }: StatCardProps) {
  return (
    <Link href={href} passHref className="h-full">
      <Card className="text-center shadow-md h-full hover:bg-muted/50 transition-colors border-primary/10">
        <CardContent className="p-3 flex flex-col items-center justify-center h-full">
          <Icon className={cn("h-7 w-7 mb-1", iconColor || "text-primary")} />
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <p className="text-xl font-bold">{value}</p>
          )}
          <p className="text-[10px] text-muted-foreground uppercase font-semibold text-center leading-tight">
            {title}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
