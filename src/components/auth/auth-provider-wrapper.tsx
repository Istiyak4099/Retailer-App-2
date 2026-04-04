"use client";
import { AuthProvider } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";

export default function AuthProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't wrap login page in AuthProvider to avoid redirect loops
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return <AuthProvider>{children}</AuthProvider>;
}
