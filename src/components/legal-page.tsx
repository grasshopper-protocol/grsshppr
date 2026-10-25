import Link from "next/link";

export const LEGAL_CONTACT_EMAIL = "natan.grsshppr@gmail.com";
export const LEGAL_OPERATOR = "Natan Santolo";

// Shared shell for /privacy-policy and /terms-of-service — plain, readable prose.
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p>
      <div className="mt-10 flex flex-col gap-10 text-base leading-7 text-muted-foreground">
        {children}
      </div>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5">{children}</ul>;
}

export function ContactLink() {
  return (
    <a
      href={`mailto:${LEGAL_CONTACT_EMAIL}`}
      className="text-foreground underline underline-offset-4 hover:no-underline"
    >
      {LEGAL_CONTACT_EMAIL}
    </a>
  );
}

export function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className = "text-foreground underline underline-offset-4 hover:no-underline";
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
