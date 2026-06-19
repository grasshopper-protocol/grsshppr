import Link from "next/link";
import { Compass, SquaresFour } from "@phosphor-icons/react/dist/ssr";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { MobileNav } from "@/components/mobile-nav";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              Grasshopper
            </Link>
            <div className="hidden items-center gap-1 sm:flex">
              <Link
                href="/explore"
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Compass size={16} />
                Explore
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <SquaresFour size={16} />
                Dashboard
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MobileNav />
            <ThemeToggle />
            <UserMenu />
          </div>
        </nav>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      </main>
    </>
  );
}
