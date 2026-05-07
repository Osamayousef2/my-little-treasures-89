import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, BookHeart, Plus, FolderHeart, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/album", label: "الألبوم", icon: BookHeart },
  { to: "/add", label: "إضافة", icon: Plus, primary: true },
  { to: "/categories", label: "الفئات", icon: FolderHeart },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { location } = useRouterState();
  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };

  return (
    <div className="min-h-screen pb-24">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <BookHeart className="h-4 w-4" />
            </div>
            <span className="font-bold text-base">دفتر الذكريات</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="خروج">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur border border-border rounded-full shadow-soft px-2 py-1.5 flex items-center gap-1">
        {NAV.map((n) => {
          const active = n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to);
          if (n.primary) {
            return (
              <Link key={n.to} to={n.to} className="mx-1 h-11 w-11 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-soft hover:bg-primary/90 transition">
                <n.icon className="h-5 w-5" />
              </Link>
            );
          }
          return (
            <Link key={n.to} to={n.to}
              className={`px-3 h-10 rounded-full grid place-items-center text-xs font-medium gap-1 flex-row-reverse transition ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <n.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
