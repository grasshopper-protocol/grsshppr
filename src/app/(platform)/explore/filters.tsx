"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useCallback, useTransition } from "react";

export function ExploreFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`/explore?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition]
  );

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <MagnifyingGlass
          size={16}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Search mentors…"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => updateParam("search", e.target.value)}
          className="h-9 w-52 pl-8"
        />
      </div>
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          defaultChecked={searchParams.get("available") === "true"}
          onChange={(e) =>
            updateParam("available", e.target.checked ? "true" : "")
          }
          className="h-4 w-4 rounded border-border"
        />
        Available
      </label>
    </div>
  );
}
