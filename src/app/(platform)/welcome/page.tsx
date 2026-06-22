"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Fingerprint, ArrowRight } from "@phosphor-icons/react";

export default function WelcomePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  async function handleRegisterPasskey() {
    setError(null);
    setRegistering(true);
    const { error } = await authClient.passkey.addPasskey();
    if (error) {
      setError(error.message ?? "Could not register passkey");
      setRegistering(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">You&apos;re in!</CardTitle>
          <CardDescription>
            Set up a passkey for instant sign-in next time — no passwords, no redirects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={handleRegisterPasskey}
            disabled={registering}
          >
            <Fingerprint size={18} weight="bold" />
            {registering ? "Registering…" : "Set up passkey"}
          </Button>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => router.push("/dashboard")}
          >
            Skip for now
            <ArrowRight size={14} />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
