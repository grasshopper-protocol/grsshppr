import Link from "next/link";
import { ArrowRight, MagnifyingGlass, CalendarCheck, Target } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-6">
      <main className="flex w-full max-w-2xl flex-col items-center gap-16 py-24 text-center">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Grow with a mentor
          </h1>
          <p className="text-lg text-muted-foreground">
            Free, open-source mentoring for tech &amp; design professionals.
          </p>
        </div>

        <div className="grid w-full gap-6 text-left sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <MagnifyingGlass size={24} className="text-foreground" />
            <h2 className="text-sm font-medium text-foreground">
              Find mentors
            </h2>
            <p className="text-sm text-muted-foreground">
              Browse by expertise, experience, and availability.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <CalendarCheck size={24} className="text-foreground" />
            <h2 className="text-sm font-medium text-foreground">
              Book sessions
            </h2>
            <p className="text-sm text-muted-foreground">
              1:1 calls with shared notes that persist.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Target size={24} className="text-foreground" />
            <h2 className="text-sm font-medium text-foreground">
              Track goals
            </h2>
            <p className="text-sm text-muted-foreground">
              Link sessions to goals. See your progress over time.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Go to dashboard
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Explore mentors
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get started
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Explore mentors
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
