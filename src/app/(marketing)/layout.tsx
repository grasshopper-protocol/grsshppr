import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const REPO = "https://github.com/grasshopper-protocol/grsshppr";

const footerGroups = [
  {
    title: "Project",
    links: [
      { label: "License (MIT)", href: `${REPO}/blob/main/LICENSE` },
      { label: "Roadmap", href: `${REPO}/blob/main/product/roadmap/README.md` },
      { label: "Decisions", href: `${REPO}/blob/main/decisions/README.md` },
      { label: "Security", href: `${REPO}/blob/main/SECURITY.md` },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "GitHub", href: REPO },
      { label: "Contribute", href: `${REPO}/blob/main/CONTRIBUTING.md` },
      { label: "Code of Conduct", href: `${REPO}/blob/main/CODE_OF_CONDUCT.md` },
    ],
  },
];

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="" width={60} height={60} priority />
            <span className="text-base font-semibold tracking-tight text-foreground">Grsshppr</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground">
          <div className="grid gap-10 sm:grid-cols-3">
            <div className="flex flex-col gap-3">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/logo.svg" alt="" width={36} height={36} className="opacity-90" />
                <span className="text-base font-semibold tracking-tight text-foreground">Grsshppr</span>
              </Link>
              <p className="max-w-xs">Free, open-source mentoring, owned by everyone.</p>
              <p>
                Built by volunteers —{" "}
                <a
                  href={`${REPO}/blob/main/CONTRIBUTING.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  contribute
                </a>
                .
              </p>
            </div>
            {footerGroups.map((group) => (
              <nav key={group.title} className="flex flex-col gap-3">
                <h2 className="font-medium text-foreground">{group.title}</h2>
                <ul className="flex flex-col gap-2">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div className="mt-10 border-t border-border pt-6">
            © {new Date().getFullYear()} Grsshppr · Open source under MIT
          </div>
        </div>
      </footer>
    </>
  );
}
