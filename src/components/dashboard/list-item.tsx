import React from "react";
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Loader2 } from "lucide-react";

interface ListItemProps {
  icon: React.ElementType;
  title: string;
  value?: string | number;
  href: string;
  loading?: boolean;
}

export function ListItem({ icon: Icon, title, value, href, loading }: ListItemProps) {
  return (
    <Link href={href} passHref>
      <Card className="shadow-sm hover:shadow-md transition-shadow border-none bg-muted/30">
        <CardContent className="p-4 flex items-center">
          <Icon className="h-6 w-6 text-primary mr-4" />
          <div className="flex-grow">
            <p className="font-semibold text-sm">{title}</p>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              value !== undefined && <p className="text-muted-foreground text-xs">{value}</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
