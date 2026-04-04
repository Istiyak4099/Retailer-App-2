"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function ComplianceModal({ loading }: { loading: boolean }) {
    const { handleComplianceConfirm, handleComplianceDeny } = useAuth();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <AlertDialog open={true}>
                <AlertDialogContent className="max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center text-xl md:text-2xl">
                            Riba-Free Compliance
                            <span dir="rtl" className="block mt-1">الالتزام بالمعاملات الخالية من الربا</span>
                        </AlertDialogTitle>
                    </AlertDialogHeader>
                    
                    <div className="py-4 space-y-4 text-muted-foreground">
                        <p className="text-center">This platform is exclusively optimized for retailers operating on a strict zero-interest (Riba-free) EMI model.</p>
                        <p dir="rtl" className="text-center">
                        هذه المنصة مخصصة حصرياً للتجار الذين يعملون بنظام الأقساط الشهرية بدون فوائد (خالٍ من الربا) فقط.
                        </p>
                    </div>

                    <div className="pt-2 font-semibold text-foreground space-y-2">
                        <p className="text-center">Do you confirm that your shop follows a 100% Riba-free policy?</p>
                        <p dir="rtl" className="text-center">
                        هل تؤكد أن متجرك يتبع سياسة خالية من الربا بنسبة 100٪؟
                        </p>
                    </div>
                    
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
                        <Button
                            variant="outline"
                            onClick={handleComplianceDeny}
                            disabled={loading}
                            className="w-full sm:w-auto"
                        >
                            No, I do not / <span dir="rtl">لا أوافق</span>
                        </Button>
                        <Button
                            onClick={handleComplianceConfirm}
                            disabled={loading}
                            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                        >
                             {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Yes, I Confirm / <span dir="rtl">نعم أوافق</span>
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
