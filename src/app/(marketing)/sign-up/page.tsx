"use client";

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
import { GithubLogo, GoogleLogo } from "@phosphor-icons/react";

export default function SignUpPage() {
  // ponytail: callbackURL goes to /welcome where we prompt passkey setup
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
            onClick={() =>
              authClient.signIn.social({ provider: "google", callbackURL: "/welcome" })
            }
          >
            <GoogleLogo size={18} />
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              authClient.signIn.social({ provider: "github", callbackURL: "/welcome" })
            }
          >
            <GithubLogo size={18} />
            Continue with GitHub
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
