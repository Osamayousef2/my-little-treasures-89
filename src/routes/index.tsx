import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { useMemories, useSignedUrl, type Memory } from "@/lib/useMemories";
import { useChildren, type Child } from "@/lib/useChildren";
import { CATEGORIES, categoryOf } from "@/lib/categories";
import { AddChildDialog, colorOf } from "@/components/AddChildDialog";
import { Lightbox } from "@/components/Lightbox";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Heart, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "الرئيسية - دفتر الذكريات" }] }),
  component: HomePage,
});

function HomePage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  const { items } = useMemories(user?.id);
  const { children, reload: reloadChildren } = useChildren(user?.id);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  if (loading || !user) return null;

  const recent = items.slice(0, 8);
  const counts = CATEGORIES.map((c) => ({ ...c, count: items.filter((i) => i.type === c.key).length }));

  const removeChild = async (id: string) => {
    if (!confirm("متأكد عايز تحذف الطفل ده؟")) return;
    const { error } = await supabase.from("children").delete().eq("id", id);
    if (error) return toast.error(error.message);
    reloadChildren();
  };

  return (
    <AppShell>
      <section className="mb-6">
        <p className="text-sm text-muted-foreground">أهلاً بعودتك 👋</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">دفتر ذكريات العائلة 💖</h1>
      </section>

      {/* Children */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> الأطفال</h2>
          <AddChildDialog userId={user.id} onAdded={reloadChildren} trigger={
            <Button size="sm" className="rounded-full"><Plus className="h-4 w-4 ml-1" /> إضافة طفل</Button>
          } />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {children.map((c) => <ChildCard key={c.id} child={c} onRemove={removeChild} />)}
          <AddChildDialog userId={user.id} onAdded={reloadChildren} trigger={
            <button className="aspect-square rounded-3xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-primary transition-colors">
              <div className="h-12 w-12 rounded-full bg-primary/10 grid place-items-center">
                <Plus className="h-6 w-6" />
              </div>
              <span className="font-bold text-sm">طفل جديد</span>
            </button>
          } />
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Card className="p-4 shadow-card bg-gradient-card">
          <p className="text-xs text-muted-foreground">إجمالي الذكريات</p>
          <p className="text-3xl font-bold mt-1 text-primary">{items.length}</p>
        </Card>
        <Card className="p-4 shadow-card sm:col-span-3 flex items-center justify-between gap-3 bg-gradient-card">
          <div>
            <p className="text-xs text-muted-foreground">إضافة جديدة</p>
            <p className="font-bold mt-1">احفظ لحظة جديدة الآن ✨</p>
          </div>
          <Link to="/add">
            <Button className="rounded-full shadow-soft"><Plus className="h-4 w-4 ml-1" /> أضف ذكرى</Button>
          </Link>
        </Card>
      </div>

      {/* Recent gallery */}
      {recent.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> آخر الذكريات</h2>
            <Link to="/album" className="text-xs text-primary hover:underline">عرض الكل</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {recent.map((it, i) => (
              <RecentTile key={it.id} item={it} onClick={() => setLightboxIndex(i)} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">حسب الفئة</h2>
          <Link to="/categories" className="text-xs text-primary hover:underline">عرض الكل</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {counts.map((c) => (
            <Link key={c.key} to="/album" search={{ category: c.key }}>
              <Card className="p-4 shadow-card hover:shadow-soft transition group bg-card hover:-translate-y-0.5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-hero text-white grid place-items-center shadow-soft">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.count} عنصر</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {items.length === 0 && (
        <div className="mt-10 text-center py-12 border-2 border-dashed border-primary/30 rounded-3xl bg-card/50">
          <Sparkles className="h-10 w-10 mx-auto text-primary mb-3" />
          <p className="font-bold">ابدأ صفحتك الأولى من الذكريات</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">أضف شهادة، رسمة، أو صورة 💕</p>
          <Link to="/add"><Button className="rounded-full shadow-soft"><Plus className="h-4 w-4 ml-1" /> أضف ذكرى</Button></Link>
        </div>
      )}

      <Lightbox items={recent} index={lightboxIndex} onClose={() => setLightboxIndex(-1)} onIndex={setLightboxIndex} />
    </AppShell>
  );
}

function ChildCard({ child, onRemove }: { child: Child; onRemove: (id: string) => void }) {
  const col = colorOf(child.color);
  return (
    <Link to="/album" search={{ child: child.id }}>
      <Card className="group relative aspect-square rounded-3xl border-2 border-primary/10 overflow-hidden bg-gradient-card shadow-soft hover:shadow-pop transition-all hover:-translate-y-1 cursor-pointer p-0">
        <div className={`absolute inset-0 bg-gradient-to-br ${col.cls} opacity-30`} />
        <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
          <div className={`h-16 w-16 rounded-full bg-gradient-to-br ${col.cls} flex items-center justify-center text-2xl font-bold text-white shadow-soft mb-2`}>
            {child.name.slice(0, 1)}
          </div>
          <h3 className="font-bold">{child.name}</h3>
          <Heart className="h-3.5 w-3.5 text-primary mt-1" />
        </div>
        <button
          onClick={(e) => { e.preventDefault(); onRemove(child.id); }}
          className="absolute top-2 left-2 p-1.5 rounded-full bg-white/90 opacity-0 group-hover:opacity-100 transition"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      </Card>
    </Link>
  );
}

function RecentTile({ item, onClick }: { item: Memory; onClick: () => void }) {
  const url = useSignedUrl(item.file_url);
  const cat = categoryOf(item.type);
  const isImage = ["drawing", "certificate", "photo", "school"].includes(item.type);
  const isVideo = item.type === "video";

  return (
    <button onClick={onClick} className="group text-right">
      <Card className="overflow-hidden shadow-card hover:shadow-soft transition p-0 hover:-translate-y-0.5">
        <div className="aspect-square bg-gradient-to-br from-muted to-card relative">
          {url && isImage && <img src={url} alt={item.title ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
          {url && isVideo && <video src={url} className="w-full h-full object-cover" />}
          {(!url || (!isImage && !isVideo)) && (
            <div className="h-full grid place-items-center p-4 text-center">
              <cat.icon className="h-10 w-10 text-primary/60" />
            </div>
          )}
          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-card/90 backdrop-blur shadow-card">{cat.label}</span>
        </div>
        <div className="p-3">
          <p className="font-bold text-sm truncate">{item.title || "بدون عنوان"}</p>
          {item.item_date && <p className="text-xs text-muted-foreground mt-0.5">{item.item_date}</p>}
        </div>
      </Card>
    </button>
  );
}
