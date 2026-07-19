"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, LinkSimple, ArrowSquareOut } from "@phosphor-icons/react";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<"mentor" | "mentee">("mentee");
  const [slug, setSlug] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [expertiseInput, setExpertiseInput] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile }) => {
        if (profile) {
          setRole(profile.role);
          setSlug(profile.slug);
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
          <p className="mt-1 text-muted-foreground">
            This is how mentees discover you.
          </p>
        </div>
        {role === "mentor" && slug && (
          <Link
            href={`/mentor/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            View public profile
            <ArrowSquareOut size={14} />
          </Link>
        )}
      </div>

      {role === "mentor" && slug && (
        <p className="mt-2 text-xs text-muted-foreground">
          grsshppr.org/mentor/{slug}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
    </div>
  );
}
