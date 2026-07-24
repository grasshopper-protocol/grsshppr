"use client";

import { useState } from "react";
import Link from "next/link";
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
import { GithubLogo, GoogleLogo, CircleNotch } from "@phosphor-icons/react";

export default function SignUpPage() {
  // ponytail: callbackURL goes to /welcome where we prompt passkey setup
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  async function handleGoogle() {
    setGoogleLoading(true);
    await authClient.signIn.social({ provider: "google", callbackURL: "/welcome" });
    setGoogleLoading(false);
  }

  async function handleGithub() {
    setGithubLoading(true);
    await authClient.signIn.social({ provider: "github", callbackURL: "/welcome" });
    setGithubLoading(false);
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Choose how you&apos;d like to sign up
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <CircleNotch className="animate-spin" size={18} />
            ) : (
              <GoogleLogo size={18} />
            )}
            {googleLoading ? "Loading..." : "Continue with Google"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGithub}
            disabled={githubLoading}
          >
            {githubLoading ? (
              <CircleNotch className="animate-spin" size={18} />
            ) : (
              <GithubLogo size={18} />
            )}
            {githubLoading ? "Loading..." : "Continue with GitHub"}
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}