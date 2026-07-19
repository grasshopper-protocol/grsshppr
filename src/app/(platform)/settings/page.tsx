"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Fingerprint, Trash, Key } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userName, setUserName] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [role, setRole] = useState<"mentor" | "mentee">("mentee");
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
        if (profile) setRole(profile.role);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(newRole: "mentor" | "mentee") {
    setRole(newRole);
    setSaving(true);
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
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
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <p className="mt-1 text-muted-foreground">
        Manage your sign-in and account settings.
      </p>

      <div className="mt-6 space-y-1.5">
        <Label htmlFor="role">Role</Label>
        <Select value={role} onValueChange={(v) => handleRoleChange(v as "mentor" | "mentee")}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mentor">Mentor</SelectItem>
            <SelectItem value="mentee">Mentee</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {saving ? "Saving…" : "Changing your role affects what you see across the platform."}
        </p>
      </div>

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
