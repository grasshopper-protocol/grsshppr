import Link from "next/link";
import {
  ArrowRight,
  GithubLogo,
  HandHeart,
} from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { BuiltWith } from "@/components/built-with";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="flex flex-col items-center px-6 pb-24 pt-20 text-center sm:pt-28">
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          The mentoring platform that belongs to everyone
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          Free, open-source, community-owned. Mentoring for tech &amp; design
          professionals who believe knowledge should be shared, not sold.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
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
                Find a mentor
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <HandHeart size={16} />
                Become a mentor
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── Why we built this ── */}
      <section className="border-t border-border bg-secondary/30 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Why we built this
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Mentoring shouldn&apos;t have a paywall
          </h2>
          <p className="mt-4 text-muted-foreground">
            Most mentoring platforms charge hundreds per month, flood you with
            thousands of unvetted profiles, or reduce mentoring to a single
            transactional call. We think that&apos;s broken.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-3xl gap-8 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-3xl font-semibold text-foreground">$0</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Always free. Mentors volunteer their time.
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-semibold text-foreground">Purposeful</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sessions link to goals. Not isolated calls.
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-semibold text-foreground">Yours</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open source. Community-owned. No investor pressure.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-border px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            How it works
          </h2>
        </div>
        <div className="mx-auto mt-12 grid max-w-3xl gap-10 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
              1
            </span>
            <h3 className="text-sm font-medium text-foreground">
              Browse mentors
            </h3>
            <p className="text-sm text-muted-foreground">
              Filter by expertise, experience, and availability. Every mentor is
              a volunteer who wants to help.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
              2
            </span>
            <h3 className="text-sm font-medium text-foreground">
              Book a free session
            </h3>
            <p className="text-sm text-muted-foreground">
              Pick a time that works. Each session has collaborative notes that
              persist — creating continuity across conversations.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
              3
            </span>
            <h3 className="text-sm font-medium text-foreground">
              Track your growth
            </h3>
            <p className="text-sm text-muted-foreground">
              Set goals, link sessions to them, and see your progress over time.
              One-off calls become a journey.
            </p>
          </div>
        </div>
      </section>

      {/* ── For mentors ── */}
      <section className="border-t border-border bg-secondary/30 px-6 py-20">
        <div className="mx-auto max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              For mentors
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Share what took you years to learn
            </h2>
            <p className="mt-4 text-muted-foreground">
              You remember what it was like starting out — the questions nobody
              answered, the mistakes you had to learn from alone. Give someone
              else a shorter path.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                Set your availability. Mentees book around your schedule.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                See the impact you make through completed goals attributed to you.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                No commitments. Mentor when you can, pause when you
                can&apos;t.
              </li>
            </ul>
            <Link
              href="/sign-up"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <HandHeart size={16} />
              Start mentoring
            </Link>
        </div>
      </section>

      {/* ── Open source & contributors ── */}
      <section className="border-t border-border px-6 py-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Open source. Free forever.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Grsshppr is MIT-licensed and community-built. No premium tiers, no
              investor pressure, no rug pulls. The code is yours to read, run,
              and improve.
            </p>
          </div>
          <a
            href="https://github.com/grasshopper-protocol/grsshppr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <GithubLogo size={18} />
            View on GitHub
          </a>
          {/* ponytail: contributor avatars hidden until we have more people.
              Uncomment when ready:
          <div className="mt-4">
            <p className="mb-3 text-sm text-muted-foreground">Built by</p>
            <a href="https://github.com/grasshopper-protocol/grsshppr/graphs/contributors" target="_blank" rel="noopener noreferrer">
              <img src="https://contrib.rocks/image?repo=grasshopper-protocol/grsshppr&anon=0&columns=8" alt="Grsshppr contributors" className="mx-auto max-w-xs" loading="lazy" />
            </a>
          </div>
          */}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-border bg-secondary/30 px-6 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Mentoring should be free.
            <br />
            Help us prove it.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Whether you&apos;re looking for guidance, ready to give back, or
            want to contribute code — there&apos;s a place for you here.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Go to dashboard
                <ArrowRight size={16} />
              </Link>
            ) : (
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Join Grsshppr
                <ArrowRight size={16} />
              </Link>
            )}
            <a
              href="https://github.com/grasshopper-protocol/grsshppr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <GithubLogo size={16} />
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ── Built with open tools ── */}
      <BuiltWith />
    </div>
  );
}
