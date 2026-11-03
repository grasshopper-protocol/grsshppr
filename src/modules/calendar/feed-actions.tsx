import { Button } from "@/components/ui/button";

/** The two actions for a live link. */
export function CalendarFeedActions({
  busy,
  onMakeNew,
  onTurnOff,
}: {
  busy: boolean;
  onMakeNew: () => void;
  onTurnOff: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="min-h-11" disabled={busy} onClick={onMakeNew}>
        Make a new link
      </Button>
      <Button variant="ghost" size="sm" disabled={busy} onClick={onTurnOff} className="min-h-11 text-muted-foreground hover:text-destructive">
        Turn off
      </Button>
    </div>
  );
}
