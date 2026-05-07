import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { useMemories } from "@/lib/useMemories";
import { CATEGORIES } from "@/lib/categories";
import { Card } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "الفئات - دفتر الذكريات" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  const { items } = useMemories(user?.id);

  if (loading || !user) return null;

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-1">الفئات</h1>
      <p className="text-sm text-muted-foreground mb-6">اختر فئة لتصفحها</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CATEGORIES.map((c) => {
          const count = items.filter((i) => i.type === c.key).length;
          return (
            <Link key={c.key} to="/album" search={{ category: c.key }}>
              <Card className="p-5 shadow-card hover:shadow-soft transition flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-accent text-primary grid place-items-center">
                  <c.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{c.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.hint}</p>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-primary leading-none">{count}</p>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground mt-1 mr-auto" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
