"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GithubLogo, GoogleLogo, Fingerprint } from "@phosphor-icons/react";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePasskey() {
    setError(null);
    setLoading(true);
    const { error } = await authClient.signIn.passkey();
    if (error) {
      setError(error.message ?? "Passkey sign-in failed");
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in to Grsshppr</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={handlePasskey}
            disabled={loading}
          >
            <Fingerprint size={18} weight="bold" />
            {loading ? "Waiting for passkey…" : "Sign in with passkey"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })
              }
            >
              <GoogleLogo size={16} />
              Google
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" })
              }
            >
              <GithubLogo size={16} />
              GitHub
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-foreground underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
