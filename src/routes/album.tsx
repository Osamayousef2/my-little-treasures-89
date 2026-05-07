import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { useMemories, useSignedUrl, type Memory } from "@/lib/useMemories";
import { CATEGORIES, categoryOf, type Category } from "@/lib/categories";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutGrid, Calendar, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";

const searchSchema = z.object({
  category: fallback(z.enum(["certificate","drawing","school","photo","video","note","all"]), "all").default("all"),
  year: fallback(z.string(), "all").default("all"),
  q: fallback(z.string(), "").default(""),
  view: fallback(z.enum(["grid","timeline"]), "grid").default("grid"),
});

export const Route = createFileRoute("/album")({
  head: () => ({ meta: [{ title: "الألبوم - دفتر الذكريات" }] }),
  validateSearch: zodValidator(searchSchema),
  component: AlbumPage,
});

function AlbumPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const search = Route.useSearch();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  const { items, reload } = useMemories(user?.id);

  const years = useMemo(() => {
    const ys = new Set<string>();
    items.forEach((i) => { const d = i.item_date ?? i.created_at; if (d) ys.add(d.slice(0, 4)); });
    return Array.from(ys).sort((a, b) => b.localeCompare(a));
  }, [items]);

  const filtered = useMemo(() => items.filter((i) => {
    if (search.category !== "all" && i.type !== search.category) return false;
    const d = i.item_date ?? i.created_at;
    if (search.year !== "all" && (!d || d.slice(0, 4) !== search.year)) return false;
    if (search.q) {
      const q = search.q.toLowerCase();
      const m = `${i.title ?? ""} ${i.description ?? ""}`.toLowerCase();
      if (!m.includes(q)) return false;
    }
    return true;
  }), [items, search]);

  const update = (patch: Partial<typeof search>) =>
    navigate({ to: "/album", search: (prev: typeof search) => ({ ...prev, ...patch }) });

  if (loading || !user) return null;

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">الألبوم</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} من {items.length} عنصر</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-full p-1">
          <button onClick={() => update({ view: "grid" })} className={`px-3 h-8 rounded-full text-xs flex items-center gap-1 ${search.view === "grid" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            <LayoutGrid className="h-3.5 w-3.5" /> شبكة
          </button>
          <button onClick={() => update({ view: "timeline" })} className={`px-3 h-8 rounded-full text-xs flex items-center gap-1 ${search.view === "timeline" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            <Calendar className="h-3.5 w-3.5" /> الخط الزمني
          </button>
        </div>
      </div>

      <Card className="p-3 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-2 shadow-card">
        <Input placeholder="ابحث بالعنوان أو الوصف..." value={search.q} onChange={(e) => update({ q: e.target.value })} />
        <Select value={search.category} onValueChange={(v) => update({ category: v as Category | "all" })}>
          <SelectTrigger><SelectValue placeholder="الفئة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفئات</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={search.year} onValueChange={(v) => update({ year: v })}>
          <SelectTrigger><SelectValue placeholder="السنة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل السنوات</SelectItem>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground">لا توجد ذكريات مطابقة</p>
          <Link to="/add"><Button className="rounded-full mt-4"><Plus className="h-4 w-4 ml-1" /> أضف ذكرى</Button></Link>
        </div>
      ) : search.view === "grid" ? (
        <GridView items={filtered} onChanged={reload} />
      ) : (
        <TimelineView items={filtered} onChanged={reload} />
      )}
    </AppShell>
  );
}

function GridView({ items, onChanged }: { items: Memory[]; onChanged: () => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((it) => <MemoryCard key={it.id} item={it} onChanged={onChanged} />)}
    </div>
  );
}

function TimelineView({ items, onChanged }: { items: Memory[]; onChanged: () => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, Memory[]>();
    items.forEach((i) => {
      const d = (i.item_date ?? i.created_at).slice(0, 7); // YYYY-MM
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(i);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  const fmtMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    return `${months[parseInt(m, 10) - 1]} ${y}`;
  };

  return (
    <div className="space-y-8">
      {groups.map(([ym, list]) => (
        <section key={ym}>
          <h3 className="font-bold text-sm text-primary mb-3 sticky top-14 bg-background/80 backdrop-blur py-1">
            {fmtMonth(ym)} <span className="text-muted-foreground font-normal">({list.length})</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {list.map((it) => <MemoryCard key={it.id} item={it} onChanged={onChanged} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function MemoryCard({ item, onChanged }: { item: Memory; onChanged: () => void }) {
  const url = useSignedUrl(item.file_url);
  const cat = categoryOf(item.type);
  const isImage = ["drawing", "certificate", "photo", "school"].includes(item.type);
  const isVideo = item.type === "video";
  const isFile = !isImage && !isVideo && item.file_url;

  const remove = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("حذف هذه الذكرى؟")) return;
    if (item.file_url) await supabase.storage.from("album").remove([item.file_url]);
    const { error } = await supabase.from("album_items").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    onChanged();
  };

  return (
    <Card className="group overflow-hidden shadow-card hover:shadow-soft transition relative p-0">
      <div className="aspect-square bg-muted relative">
        {url && isImage && <img src={url} alt={item.title ?? ""} className="w-full h-full object-cover" />}
        {url && isVideo && <video src={url} className="w-full h-full object-cover" />}
        {(!url || (!isImage && !isVideo)) && (
          <div className="h-full grid place-items-center text-muted-foreground p-4 text-center">
            <div>
              <cat.icon className="h-10 w-10 mx-auto mb-2 text-primary/60" />
              {isFile && <p className="text-xs">ملف مرفق</p>}
              {item.type === "note" && item.description && <p className="text-xs line-clamp-4">{item.description}</p>}
            </div>
          </div>
        )}
        <button onClick={remove} className="absolute top-2 left-2 p-1.5 rounded-full bg-card/90 opacity-0 group-hover:opacity-100 transition shadow-card">
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
        <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-card/90 text-foreground/80">{cat.label}</span>
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm truncate">{item.title || "بدون عنوان"}</p>
        {item.item_date && <p className="text-xs text-muted-foreground mt-0.5">{item.item_date}</p>}
      </div>
    </Card>
  );
}
