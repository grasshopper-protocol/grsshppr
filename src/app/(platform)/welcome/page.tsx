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
import { Fingerprint, ArrowRight, Chalkboard, GraduationCap } from "@phosphor-icons/react";

type Step = "role" | "passkey";

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<"mentor" | "mentee" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  async function handleRoleSubmit() {
    if (!role) return;
    setSaving(true);
    setError(null);

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    if (!res.ok) {
      setError("Something went wrong. Try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setStep("passkey");
  }

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

  if (step === "role") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">How will you use Grasshopper?</CardTitle>
            <CardDescription>You can change this later in settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant={role === "mentor" ? "default" : "outline"}
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => setRole("mentor")}
            >
              <Chalkboard size={20} />
              <div className="text-left">
                <p className="font-medium">I want to mentor</p>
                <p className="text-xs text-muted-foreground font-normal">Share your expertise with others</p>
              </div>
            </Button>
            <Button
              variant={role === "mentee" ? "default" : "outline"}
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => setRole("mentee")}
            >
              <GraduationCap size={20} />
              <div className="text-left">
                <p className="font-medium">I want to find a mentor</p>
                <p className="text-xs text-muted-foreground font-normal">Get guidance from experienced professionals</p>
              </div>
            </Button>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <Button
              className="w-full mt-2"
              onClick={handleRoleSubmit}
              disabled={!role || saving}
            >
              {saving ? "Saving…" : "Continue"}
              <ArrowRight size={14} />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">One more thing</CardTitle>
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
