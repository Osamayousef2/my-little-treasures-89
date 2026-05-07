import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { useMemories, useSignedUrl } from "@/lib/useMemories";
import { CATEGORIES, categoryOf } from "@/lib/categories";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookHeart, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "الرئيسية - دفتر الذكريات" }] }),
  component: HomePage,
});

function HomePage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  const { items } = useMemories(user?.id);

  if (loading || !user) return null;

  const latest = items[0];
  const counts = CATEGORIES.map((c) => ({ ...c, count: items.filter((i) => i.type === c.key).length }));

  return (
    <AppShell>
      <section className="mb-8">
        <p className="text-sm text-muted-foreground">أهلاً بعودتك</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">دفتر ذكريات العائلة 🤍</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          مكان دافئ وآمن لحفظ شهادات وإنجازات ورسومات وصور بنتك على مر السنين.
        </p>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Card className="p-4 shadow-card">
          <p className="text-xs text-muted-foreground">إجمالي الذكريات</p>
          <p className="text-3xl font-bold mt-1">{items.length}</p>
        </Card>
        <Card className="p-4 shadow-card sm:col-span-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">إضافة جديدة</p>
            <p className="font-semibold mt-1">احفظ لحظة جديدة الآن</p>
          </div>
          <Link to="/add">
            <Button className="rounded-full"><Plus className="h-4 w-4 ml-1" /> أضف ذكرى</Button>
          </Link>
        </Card>
      </div>

      {latest && <LatestCard memory={latest} />}

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2"><BookHeart className="h-5 w-5 text-primary" /> حسب الفئة</h2>
          <Link to="/categories" className="text-xs text-muted-foreground hover:text-primary">عرض الكل</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {counts.map((c) => (
            <Link key={c.key} to="/album" search={{ category: c.key }}>
              <Card className="p-4 shadow-card hover:shadow-soft transition group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent text-accent-foreground grid place-items-center">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.count} عنصر</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {items.length === 0 && (
        <div className="mt-10 text-center py-12 border-2 border-dashed border-border rounded-2xl">
          <Sparkles className="h-8 w-8 mx-auto text-primary mb-3" />
          <p className="font-semibold">ابدأ صفحتك الأولى من الذكريات</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">أضف شهادة، رسمة، أو صورة لبنتك</p>
          <Link to="/add"><Button className="rounded-full"><Plus className="h-4 w-4 ml-1" /> أضف ذكرى</Button></Link>
        </div>
      )}
    </AppShell>
  );
}

function LatestCard({ memory }: { memory: ReturnType<typeof useMemories>["items"][number] }) {
  const url = useSignedUrl(memory.file_url);
  const cat = categoryOf(memory.type);
  const isVideo = memory.type === "video";
  const isImage = ["drawing", "certificate", "photo", "school"].includes(memory.type);

  return (
    <section>
      <h2 className="font-bold text-lg mb-3">آخر ذكرى</h2>
      <Card className="overflow-hidden shadow-card">
        <div className="grid sm:grid-cols-2 gap-0">
          <div className="aspect-video sm:aspect-auto bg-muted relative">
            {url && isImage && <img src={url} alt={memory.title ?? ""} className="w-full h-full object-cover" />}
            {url && isVideo && <video src={url} className="w-full h-full object-cover" controls />}
            {!url && (
              <div className="h-full grid place-items-center text-muted-foreground">
                <cat.icon className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="p-5 flex flex-col justify-center">
            <span className="text-xs text-primary font-semibold">{cat.label}</span>
            <h3 className="text-xl font-bold mt-1">{memory.title || "بدون عنوان"}</h3>
            {memory.item_date && <p className="text-xs text-muted-foreground mt-1">{memory.item_date}</p>}
            {memory.description && <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{memory.description}</p>}
          </div>
        </div>
      </Card>
    </section>
  );
}
