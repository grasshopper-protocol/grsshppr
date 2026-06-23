"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, X } from "@phosphor-icons/react";

interface StepProps {
  saving: boolean;
  error: string | null;
  onSkip: () => void;
}

// --- Mentor: Headline + Bio ---
export function IdentityStep({
  saving,
  error,
  onSubmit,
  onSkip,
}: StepProps & { onSubmit: (headline: string, bio: string) => void }) {
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(headline, bio);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Senior Product Designer at Acme"
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground">
          One line that tells mentees who you are
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bio">About you</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="What do you enjoy mentoring on? What's your background?"
          maxLength={500}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">{bio.length}/500</p>
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          className="flex-1 text-muted-foreground"
          onClick={onSkip}
        >
          Skip
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={saving || (!headline && !bio)}
        >
          {saving ? "Saving…" : "Continue"}
          <ArrowRight size={14} />
        </Button>
      </div>
    </form>
  );
}

// --- Mentor: Expertise tags + years ---
export function ExpertiseStep({
  saving,
  error,
  onSubmit,
  onSkip,
}: StepProps & {
  onSubmit: (expertise: string[], experienceYears?: number) => void;
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [years, setYears] = useState("");

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" && e.key !== ",") return;
    e.preventDefault();
    const tag = input.trim();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setInput("");
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const y = years ? parseInt(years, 10) : undefined;
        onSubmit(tags, y);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="expertise">Skills & topics</Label>
        <Input
          id="expertise"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={addTag}
          placeholder="Type a skill and press Enter"
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  className="ml-0.5 hover:text-foreground"
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Up to 10 tags</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="years">Years of experience (optional)</Label>
        <Input
          id="years"
          type="number"
          min={0}
          max={50}
          value={years}
          onChange={(e) => setYears(e.target.value)}
          placeholder="e.g. 8"
          className="w-24"
        />
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          className="flex-1 text-muted-foreground"
          onClick={onSkip}
        >
          Skip
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={saving || tags.length === 0}
        >
          {saving ? "Saving…" : "Continue"}
          <ArrowRight size={14} />
        </Button>
      </div>
    </form>
  );
}

// --- Mentee: Bio ---
export function AboutYouStep({
  saving,
  error,
  onSubmit,
  onSkip,
}: StepProps & { onSubmit: (bio: string) => void }) {
  const [bio, setBio] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(bio);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="mentee-bio">A bit about you</Label>
        <Textarea
          id="mentee-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="What are you working on? What kind of guidance would help you right now?"
          maxLength={500}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">{bio.length}/500</p>
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          className="flex-1 text-muted-foreground"
          onClick={onSkip}
        >
          Skip
        </Button>
        <Button type="submit" className="flex-1" disabled={saving || !bio}>
          {saving ? "Saving…" : "Continue"}
          <ArrowRight size={14} />
        </Button>
      </div>
    </form>
  );
}
