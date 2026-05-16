import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { useMemories } from "@/lib/useMemories";
import { useChildren, type Child } from "@/lib/useChildren";
import { AddChildDialog, colorOf } from "@/components/AddChildDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Heart, Trash2, Images, Sparkles, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EditChildDialog } from "@/components/EditChildDialog";
import { ageAt } from "@/lib/age";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "الرئيسية — ألبوم بنتي" },
      { name: "description", content: "دفتر ذكريات العائلة: صفحة رئيسية تجمع كل أطفالك وتعرض ألبوم كل طفل في مكان واحد." },
      { property: "og:title", content: "الرئيسية — ألبوم بنتي" },
      { property: "og:description", content: "دفتر ذكريات العائلة: صفحة رئيسية تجمع كل أطفالك في مكان واحد." },
      { property: "og:url", content: "https://my-kiddo-album.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://my-kiddo-album.lovable.app/" }],
  }),
  component: HomePage,
});

function HomePage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  const { items } = useMemories(user?.id);
  const { children, reload: reloadChildren } = useChildren(user?.id);

  if (loading || !user) return null;

  const removeChild = async (id: string) => {
    if (!confirm("متأكد عايز تحذف الطفل ده؟")) return;
    const { error } = await supabase.from("children").delete().eq("id", id);
    if (error) return toast.error(error.message);
    reloadChildren();
  };

  const countFor = (id: string) => items.filter((i) => i.child_id === id).length;
  const unassigned = items.filter((i) => !i.child_id).length;

  return (
    <AppShell>
      <section className="mb-6">
        <p className="text-sm text-muted-foreground">أهلاً بعودتك 👋</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">دفتر ذكريات العائلة 💖</h1>
        <p className="text-sm text-muted-foreground mt-1">{items.length} ذكرى محفوظة</p>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> الأطفال</h2>
          <AddChildDialog userId={user.id} onAdded={reloadChildren} trigger={
            <Button size="sm" className="rounded-full"><Plus className="h-4 w-4 ml-1" /> إضافة طفل</Button>
          } />
        </div>

        {children.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-primary/30 rounded-3xl bg-card/50">
            <Sparkles className="h-10 w-10 mx-auto text-primary mb-3" />
            <p className="font-bold">ابدأ بإضافة أول طفل</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">كل طفل له ألبومه الخاص 💕</p>
            <AddChildDialog userId={user.id} onAdded={reloadChildren} trigger={
              <Button className="rounded-full shadow-soft"><Plus className="h-4 w-4 ml-1" /> إضافة طفل</Button>
            } />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {children.map((c) => (
              <ChildCard key={c.id} child={c} count={countFor(c.id)} onRemove={removeChild} onChanged={reloadChildren} />
            ))}
            <AddChildDialog userId={user.id} onAdded={reloadChildren} trigger={
              <button className="rounded-3xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-primary transition-colors p-6 min-h-[160px]">
                <div className="h-12 w-12 rounded-full bg-primary/10 grid place-items-center">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="font-bold text-sm">طفل جديد</span>
              </button>
            } />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/album">
          <Card className="p-4 shadow-card bg-gradient-card flex items-center gap-3 hover:-translate-y-0.5 transition">
            <div className="h-11 w-11 rounded-2xl bg-gradient-hero text-white grid place-items-center shadow-soft">
              <Images className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold">كل الألبوم</p>
              <p className="text-xs text-muted-foreground">{items.length} عنصر{unassigned > 0 && ` · ${unassigned} بدون طفل`}</p>
            </div>
          </Card>
        </Link>
        <Link to="/add">
          <Card className="p-4 shadow-card bg-gradient-card flex items-center gap-3 hover:-translate-y-0.5 transition">
            <div className="h-11 w-11 rounded-2xl bg-gradient-hero text-white grid place-items-center shadow-soft">
              <Plus className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold">أضف ذكرى جديدة</p>
              <p className="text-xs text-muted-foreground">صورة، فيديو، شهادة...</p>
            </div>
          </Card>
        </Link>
      </div>
    </AppShell>
  );
}

function ChildCard({ child, count, onRemove, onChanged }: { child: Child; count: number; onRemove: (id: string) => void; onChanged: () => void }) {
  const col = colorOf(child.color);
  const age = ageAt(child.birth_date, new Date().toISOString().slice(0, 10));
  return (
    <Link to="/album" search={{ child: child.id }}>
      <Card className="group relative rounded-3xl border-2 border-primary/10 overflow-hidden bg-gradient-card shadow-soft hover:shadow-pop transition-all hover:-translate-y-1 cursor-pointer p-0 min-h-[160px]">
        <div className={`absolute inset-0 bg-gradient-to-br ${col.cls} opacity-25`} />
        <div className="relative h-full flex flex-col items-center justify-center p-5 text-center">
          <div className={`h-16 w-16 rounded-full bg-gradient-to-br ${col.cls} flex items-center justify-center text-2xl font-bold text-white shadow-soft mb-3`}>
            {child.name.slice(0, 1)}
          </div>
          <h3 className="font-bold text-lg">{child.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{count} ذكرى</p>
          {age && <p className="text-[11px] text-muted-foreground mt-0.5">🎂 {age}</p>}
          {!child.birth_date && (
            <p className="text-[11px] text-primary/80 mt-0.5">أضف تاريخ الميلاد</p>
          )}
        </div>
        <div className="absolute top-2 left-2 flex gap-1.5" onClick={(e) => e.preventDefault()}>
          <EditChildDialog
            child={child}
            onSaved={onChanged}
            trigger={
              <button aria-label="تعديل" className="p-1.5 rounded-full bg-white/95 shadow-card active:scale-95 transition">
                <Pencil className="h-3.5 w-3.5 text-primary" />
              </button>
            }
          />
          <button
            onClick={(e) => { e.preventDefault(); onRemove(child.id); }}
            aria-label="حذف"
            className="p-1.5 rounded-full bg-white/95 shadow-card active:scale-95 transition"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </button>
        </div>
      </Card>
    </Link>
  );
}
