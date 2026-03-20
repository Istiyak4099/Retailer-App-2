
"use client";

import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import placeholders from "@/app/lib/placeholder-images.json";

export default function InstallPage() {
  return (
    <AppLayout title="Setup Device">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Test DPC Card */}
        <Card className="text-center shadow-lg rounded-xl border-t-4 border-t-orange-500">
          <CardHeader>
            <CardTitle>Test DPC Setup</CardTitle>
            <CardDescription>
              Scan to provision the device.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <div className="p-4 bg-white rounded-lg border shadow-inner">
              <Image
                src={placeholders.testDpcQr.url}
                alt={placeholders.testDpcQr.alt}
                width={placeholders.testDpcQr.width}
                height={placeholders.testDpcQr.height}
                data-ai-hint={placeholders.testDpcQr.hint}
                className="rounded-md"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Required for enterprise-level device management.
            </p>
          </CardContent>
        </Card>

        {/* Lock Module Card */}
        <Card className="text-center shadow-lg rounded-xl border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle>Lock Module APK</CardTitle>
            <CardDescription>
              Scan to download and install the primary device control application.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <div className="p-4 bg-white rounded-lg border shadow-inner">
              <Image
                src={placeholders.lockModuleQr.url}
                alt={placeholders.lockModuleQr.alt}
                width={placeholders.lockModuleQr.width}
                height={placeholders.lockModuleQr.height}
                data-ai-hint={placeholders.lockModuleQr.hint}
                className="rounded-md"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Universal installer for all customer device activations.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
