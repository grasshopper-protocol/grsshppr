"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Fingerprint } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";

type Profile = {
  role: "mentor" | "mentee";
  bio: string;
  expertise: string[];
  experienceYears: number | null;
  available: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<"mentor" | "mentee">("mentee");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [expertiseInput, setExpertiseInput] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile }) => {
        if (profile) {
          setRole(profile.role);
          setBio(profile.bio ?? "");
          setExpertise(profile.expertise ?? []);
          setExperienceYears(profile.experienceYears?.toString() ?? "");
          setAvailable(profile.available);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function addExpertise(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" && e.key !== ",") return;
    e.preventDefault();
    const tag = expertiseInput.trim().toLowerCase();
    if (tag && !expertise.includes(tag) && expertise.length < 10) {
      setExpertise([...expertise, tag]);
      setExpertiseInput("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        bio: bio || undefined,
        expertise: expertise.length ? expertise : undefined,
        experienceYears: experienceYears ? parseInt(experienceYears) : undefined,
        available,
      }),
    });

    if (res.ok) {
      router.push("/dashboard");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-1 text-muted-foreground">
        Set up your profile to start mentoring or finding a mentor.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="role">I want to</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "mentor" | "mentee")}>
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mentor">Be a mentor</SelectItem>
              <SelectItem value="mentee">Find a mentor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A few words about you…"
            maxLength={500}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">{bio.length}/500</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expertise">Expertise</Label>
          <Input
            id="expertise"
            value={expertiseInput}
            onChange={(e) => setExpertiseInput(e.target.value)}
            onKeyDown={addExpertise}
            placeholder="Type a skill and press Enter"
          />
          {expertise.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {expertise.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => setExpertise(expertise.filter((t) => t !== tag))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {role === "mentor" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="experience">Years of experience</Label>
              <Input
                id="experience"
                type="number"
                min={0}
                max={50}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="available"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="available" className="font-normal">
                Available for new mentees
              </Label>
            </div>
          </>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>

      <div className="mt-10 border-t pt-6">
        <h2 className="text-lg font-semibold tracking-tight">Passkeys</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use biometrics or a security key to sign in without a password.
        </p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={async () => {
            const { error } = await authClient.passkey.addPasskey();
            if (error) alert(error.message);
            else alert("Passkey registered!");
          }}
        >
          <Fingerprint size={16} />
          Register a passkey
        </Button>
      </div>
    </div>
  );
}
