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
import {
  Fingerprint,
  ArrowRight,
  Chalkboard,
  GraduationCap,
} from "@phosphor-icons/react";
import { IdentityStep, ExpertiseStep, AboutYouStep } from "./steps";

// ponytail: mentor gets 4 steps (role → identity → expertise → passkey)
//           mentee gets 3 steps (role → about → passkey)
type MentorStep = "role" | "identity" | "expertise" | "passkey";
type MenteeStep = "role" | "about" | "passkey";
type Step = MentorStep | MenteeStep;

const MENTOR_STEPS: MentorStep[] = ["role", "identity", "expertise", "passkey"];
const MENTEE_STEPS: MenteeStep[] = ["role", "about", "passkey"];

function ProgressDots({ steps, current }: { steps: string[]; current: string }) {
  const currentIndex = steps.indexOf(current);
  return (
    <div className="flex justify-center gap-1.5 pb-2">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            i <= currentIndex ? "bg-foreground" : "bg-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<"mentor" | "mentee" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ponytail: show mentor steps (4 dots) as default before role is picked — it's the longer path
  const steps = role === "mentee" ? MENTEE_STEPS : MENTOR_STEPS;

  async function saveProfile(data: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, ...data }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Something went wrong. Try again.");
      return false;
    }
    return true;
  }

  async function handleRoleSubmit() {
    if (!role) return;
    const ok = await saveProfile({});
    if (!ok) return;
    setStep(role === "mentor" ? "identity" : "about");
  }

  async function handleIdentitySubmit(headline: string, bio: string) {
    const ok = await saveProfile({ headline, bio });
    if (ok) setStep("expertise");
  }

  async function handleExpertiseSubmit(expertise: string[], experienceYears?: number) {
    const data: Record<string, unknown> = { expertise };
    if (experienceYears !== undefined) data.experienceYears = experienceYears;
    const ok = await saveProfile(data);
    if (ok) setStep("passkey");
  }

  async function handleAboutSubmit(bio: string) {
    const ok = await saveProfile({ bio });
    if (ok) setStep("passkey");
  }

  async function handlePasskey() {
    setError(null);
    setSaving(true);
    const { error } = await authClient.passkey.addPasskey();
    setSaving(false);
    if (error) {
      setError(error.message ?? "Could not register passkey");
      return;
    }
    finishOnboarding();
  }

  function finishOnboarding() {
    if (role === "mentor") {
      router.push("/settings/availability");
    } else {
      router.push("/explore");
    }
  }

  function skipToEnd() {
    finishOnboarding();
  }

  // --- Role Step ---
  if (step === "role") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <ProgressDots steps={steps} current="role" />
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
                <p className="text-xs text-muted-foreground font-normal">
                  Share your expertise with others
                </p>
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
                <p className="text-xs text-muted-foreground font-normal">
                  Get guidance from experienced professionals
                </p>
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

  // --- Identity Step (mentor) ---
  if (step === "identity") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <ProgressDots steps={steps} current="identity" />
            <CardTitle className="text-xl">Help mentees find you</CardTitle>
            <CardDescription>
              A strong headline and bio make you stand out on Explore.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IdentityStep
              saving={saving}
              error={error}
              onSubmit={handleIdentitySubmit}
              onSkip={() => setStep("expertise")}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Expertise Step (mentor) ---
  if (step === "expertise") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <ProgressDots steps={steps} current="expertise" />
            <CardTitle className="text-xl">What can you help with?</CardTitle>
            <CardDescription>
              Add skills so mentees can find you by topic.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpertiseStep
              saving={saving}
              error={error}
              onSubmit={handleExpertiseSubmit}
              onSkip={() => setStep("passkey")}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- About Step (mentee) ---
  if (step === "about") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <ProgressDots steps={steps} current="about" />
            <CardTitle className="text-xl">Tell mentors about yourself</CardTitle>
            <CardDescription>
              What are you working on? What kind of guidance are you looking for?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AboutYouStep
              saving={saving}
              error={error}
              onSubmit={handleAboutSubmit}
              onSkip={() => setStep("passkey")}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Passkey Step ---
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <ProgressDots steps={steps} current="passkey" />
          <CardTitle className="text-xl">Secure your account</CardTitle>
          <CardDescription>
            Set up a passkey for instant sign-in next time — no passwords, no redirects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={handlePasskey}
            disabled={saving}
          >
            <Fingerprint size={18} weight="bold" />
            {saving ? "Registering…" : "Set up passkey"}
          </Button>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={skipToEnd}
          >
            Skip for now
            <ArrowRight size={14} />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
