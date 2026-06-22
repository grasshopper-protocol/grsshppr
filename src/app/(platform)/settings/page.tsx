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
import { X, Fingerprint, Trash, Key, LinkSimple } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";

type Profile = {
  role: "mentor" | "mentee";
  headline: string;
  bio: string;
  expertise: string[];
  experienceYears: number | null;
  available: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userName, setUserName] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [role, setRole] = useState<"mentor" | "mentee">("mentee");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [expertiseInput, setExpertiseInput] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [available, setAvailable] = useState(false);
  const [passkeys, setPasskeys] = useState<{ id: string; name?: string; createdAt: string; deviceType: string }[]>([]);

  async function loadPasskeys() {
    const res = await fetch("/api/auth/passkey/list-user-passkeys");
    if (res.ok) {
      const data = await res.json();
      setPasskeys(Array.isArray(data) ? data : []);
    }
  }

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.user?.name) setUserName(data.user.name);
    });
    loadPasskeys();
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile }) => {
        if (profile) {
          setRole(profile.role);
          setHeadline(profile.headline ?? "");
          setBio(profile.bio ?? "");
          setExpertise(profile.expertise ?? []);
          setLinks(profile.links ?? []);
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
        headline: headline || undefined,
        bio: bio || undefined,
        expertise: expertise.length ? expertise : undefined,
        links: links,
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
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Senior Product Designer at Shopify"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            Your role, title, or what you're known for
          </p>
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

        <div className="space-y-1.5">
          <Label htmlFor="links">Links</Label>
          <div className="flex gap-2">
            <Input
              id="links"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== ",") return;
                e.preventDefault();
                const urls = linkInput.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
                let updated = [...links];
                for (let url of urls) {
                  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
                  if (updated.length >= 5 || updated.includes(url)) continue;
                  try {
                    new URL(url);
                    updated = [...updated, url];
                  } catch {
                    // skip invalid
                  }
                }
                setLinks(updated);
                setLinkInput("");
              }}
              placeholder="https://linkedin.com/in/you"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Add up to 5 links (LinkedIn, portfolio, blog, etc.)
          </p>
          {links.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {links.map((url) => (
                <div
                  key={url}
                  className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
                >
                  <LinkSimple size={14} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{url}</span>
                  <button
                    type="button"
                    onClick={() => setLinks(links.filter((l) => l !== url))}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                </div>
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

        {passkeys.length > 0 && (
          <div className="mt-3 space-y-2">
            {passkeys.map((pk) => (
              <div
                key={pk.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Key size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {pk.name || "Passkey"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added{" "}
                      {new Date(pk.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    if (!confirm("Remove this passkey?")) return;
                    const res = await fetch("/api/auth/passkey/delete-passkey", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: pk.id }),
                    });
                    if (res.ok) loadPasskeys();
                    else alert("Failed to remove passkey.");
                  }}
                >
                  <Trash size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="mt-3"
          onClick={async () => {
            const { error } = await authClient.passkey.addPasskey();
            if (error) alert(error.message);
            else loadPasskeys();
          }}
        >
          <Fingerprint size={16} />
          {passkeys.length ? "Add another passkey" : "Register a passkey"}
        </Button>
      </div>

      <div className="mt-10 border-t pt-6">
        <h2 className="text-lg font-semibold tracking-tight text-destructive">
          Danger zone
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete your account and all data — profile, sessions,
          goals, passkeys, everything. This cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <Button
            variant="destructive"
            className="mt-3"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash size={16} />
            Delete my account
          </Button>
        ) : (
          <div className="mt-3 space-y-2">
            <Label htmlFor="confirm-delete">
              Type <span className="font-semibold">{userName}</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Your full name"
              autoComplete="off"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={deleting || confirmName !== userName}
                onClick={async () => {
                  setDeleting(true);
                  const res = await fetch("/api/profile", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ confirmName }),
                  });
                  if (res.ok) {
                    await authClient.signOut();
                    router.push("/");
                  } else {
                    alert("Something went wrong. Try again.");
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Deleting…" : "Confirm deletion"}
              </Button>
              <Button
                variant="outline"
                disabled={deleting}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
