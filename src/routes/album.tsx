import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { useMemories, useSignedUrl, type Memory } from "@/lib/useMemories";
import { useChildren } from "@/lib/useChildren";
import { CATEGORIES, categoryOf, type Category } from "@/lib/categories";
import { Lightbox } from "@/components/Lightbox";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutGrid, Calendar, Trash2, Plus, Move } from "lucide-react";
import { MoveDialog } from "@/components/MoveDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ageAt } from "@/lib/age";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";

const searchSchema = z.object({
  category: fallback(z.enum(["certificate","drawing","school","photo","video","note","all"]), "all").default("all"),
  year: fallback(z.string(), "all").default("all"),
  child: fallback(z.string(), "all").default("all"),
  tag: fallback(z.string(), "all").default("all"),
  q: fallback(z.string(), "").default(""),
  view: fallback(z.enum(["grid","timeline"]), "grid").default("grid"),
});

export const Route = createFileRoute("/album")({
  head: () => ({
    meta: [
      { title: "الألبوم — ألبوم بنتي" },
      { name: "description", content: "تصفح وابحث في كل ذكريات أطفالك: صور، فيديو، رسومات وشهادات مع فلاتر حسب الطفل والفئة والوسم والسنة." },
      { property: "og:title", content: "الألبوم — ألبوم بنتي" },
      { property: "og:description", content: "تصفح وابحث في كل ذكريات أطفالك مع فلاتر متقدمة." },
      { property: "og:url", content: "https://my-kiddo-album.lovable.app/album" },
    ],
    links: [{ rel: "canonical", href: "https://my-kiddo-album.lovable.app/album" }],
  }),
  validateSearch: zodValidator(searchSchema),
  component: AlbumPage,
});

function AlbumPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const search = Route.useSearch();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  const { items, reload } = useMemories(user?.id);
  const { children } = useChildren(user?.id);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [moveItem, setMoveItem] = useState<Memory | null>(null);

  const years = useMemo(() => {
    const ys = new Set<string>();
    items.forEach((i) => { const d = i.item_date ?? i.created_at; if (d) ys.add(d.slice(0, 4)); });
    return Array.from(ys).sort((a, b) => b.localeCompare(a));
  }, [items]);

  const allTags = useMemo(() => {
    const t = new Set<string>();
    items.forEach((i) => (i.tags ?? []).forEach((x) => t.add(x)));
    return Array.from(t).sort();
  }, [items]);

  const childMap = useMemo(() => Object.fromEntries(children.map((c) => [c.id, c])), [children]);

  const filtered = useMemo(() => items.filter((i) => {
    if (search.category !== "all" && i.type !== search.category) return false;
    if (search.child !== "all" && i.child_id !== search.child) return false;
    if (search.tag !== "all" && !(i.tags ?? []).includes(search.tag)) return false;
    const d = i.item_date ?? i.created_at;
    if (search.year !== "all" && (!d || d.slice(0, 4) !== search.year)) return false;
    if (search.q) {
      const q = search.q.toLowerCase();
      const m = `${i.title ?? ""} ${i.description ?? ""} ${(i.tags ?? []).join(" ")}`.toLowerCase();
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
          <h1 className="text-2xl font-bold">الألبوم 💝</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} من {items.length} عنصر</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-full p-1 shadow-card">
          <button onClick={() => update({ view: "grid" })} className={`px-3 h-8 rounded-full text-xs flex items-center gap-1 transition ${search.view === "grid" ? "bg-card shadow-card font-bold" : "text-muted-foreground"}`}>
            <LayoutGrid className="h-3.5 w-3.5" /> شبكة
          </button>
          <button onClick={() => update({ view: "timeline" })} className={`px-3 h-8 rounded-full text-xs flex items-center gap-1 transition ${search.view === "timeline" ? "bg-card shadow-card font-bold" : "text-muted-foreground"}`}>
            <Calendar className="h-3.5 w-3.5" /> الخط الزمني
          </button>
        </div>
      </div>

      <Card className="p-3 mb-6 grid grid-cols-2 lg:grid-cols-4 gap-2 shadow-card rounded-2xl">
        <Input aria-label="بحث في الذكريات" placeholder="🔍 بحث..." value={search.q} onChange={(e) => update({ q: e.target.value })} className="rounded-xl col-span-2 lg:col-span-1" />
        <Select value={search.category} onValueChange={(v) => update({ category: v as Category | "all" })}>
          <SelectTrigger aria-label="تصفية حسب الفئة" className="rounded-xl"><SelectValue placeholder="الفئة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفئات</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={search.child} onValueChange={(v) => update({ child: v })}>
          <SelectTrigger aria-label="تصفية حسب الطفل" className="rounded-xl"><SelectValue placeholder="الطفل" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأطفال</SelectItem>
            {children.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={search.year} onValueChange={(v) => update({ year: v })}>
          <SelectTrigger aria-label="تصفية حسب السنة" className="rounded-xl"><SelectValue placeholder="السنة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل السنوات</SelectItem>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          <button onClick={() => update({ tag: "all" })}
            className={`text-xs px-2.5 py-1 rounded-full font-bold transition ${search.tag === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>
            الكل
          </button>
          {allTags.map((t) => (
            <button key={t} onClick={() => update({ tag: search.tag === t ? "all" : t })}
              className={`text-xs px-2.5 py-1 rounded-full font-bold transition ${search.tag === t ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-primary/30 rounded-3xl bg-card/50">
          <p className="text-muted-foreground">لا توجد ذكريات مطابقة</p>
          <Link to="/add"><Button className="rounded-full mt-4 shadow-soft"><Plus className="h-4 w-4 ml-1" /> أضف ذكرى</Button></Link>
        </div>
      ) : search.view === "grid" ? (
        <GridView items={filtered} onChanged={reload} onOpen={setLightboxIndex} onMove={setMoveItem} childMap={childMap} onTagClick={(t) => update({ tag: t })} />
      ) : (
        <TimelineView items={filtered} onChanged={reload} onOpen={setLightboxIndex} onMove={setMoveItem} childMap={childMap} onTagClick={(t) => update({ tag: t })} />
      )}

      <Lightbox items={filtered} index={lightboxIndex} onClose={() => setLightboxIndex(-1)} onIndex={setLightboxIndex} childMap={childMap} onUpdated={reload} />
      <MoveDialog open={!!moveItem} onOpenChange={(v) => !v && setMoveItem(null)} item={moveItem} userId={user.id} onMoved={reload} />
    </AppShell>
  );
}

type ChildMap = Record<string, import("@/lib/useChildren").Child>;
type CardCommonProps = { onChanged: () => void; onOpen: (i: number) => void; onMove: (m: Memory) => void; childMap: ChildMap; onTagClick: (t: string) => void };

function GridView({ items, ...rest }: { items: Memory[] } & CardCommonProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((it, i) => <MemoryCard key={it.id} item={it} index={i} {...rest} />)}
    </div>
  );
}

function TimelineView({ items, ...rest }: { items: Memory[] } & CardCommonProps) {
  const groups = useMemo(() => {
    const map = new Map<string, { item: Memory; index: number }[]>();
    items.forEach((i, idx) => {
      const d = (i.item_date ?? i.created_at).slice(0, 7);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push({ item: i, index: idx });
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
          <h2 className="font-bold text-sm text-primary mb-3 sticky top-14 bg-background/90 backdrop-blur py-2 rounded-full px-3 inline-block shadow-card">
            {fmtMonth(ym)} <span className="text-muted-foreground font-normal">({list.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {list.map(({ item, index }) => <MemoryCard key={item.id} item={item} index={index} {...rest} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function MemoryCard({ item, index, onChanged, onOpen, onMove, childMap, onTagClick }: { item: Memory; index: number } & CardCommonProps) {
  const url = useSignedUrl(item.file_url);
  const cat = categoryOf(item.type);
  const isImage = ["drawing", "certificate", "photo", "school"].includes(item.type);
  const isVideo = item.type === "video";
  const child = item.child_id ? childMap[item.child_id] : null;
  const ageStr = ageAt(child?.birth_date, item.item_date);

  const remove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("حذف هذه الذكرى؟")) return;
    if (item.file_url) await supabase.storage.from("album").remove([item.file_url]);
    const { error } = await supabase.from("album_items").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    onChanged();
  };

  const move = (e: React.MouseEvent) => { e.stopPropagation(); onMove(item); };

  return (
    <button onClick={() => onOpen(index)} className="text-right w-full">
      <Card className="group overflow-hidden shadow-card hover:shadow-pop transition relative p-0 hover:-translate-y-0.5 rounded-2xl border-2 border-primary/5">
        <div className="aspect-square bg-gradient-to-br from-muted to-card relative">
          {url && isImage && <img src={url} alt={item.title ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
          {url && isVideo && (
            <>
              <video src={url} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 grid place-items-center">
                <div className="h-12 w-12 rounded-full bg-white/90 grid place-items-center shadow-soft">
                  <div className="w-0 h-0 border-y-[8px] border-y-transparent border-r-[12px] border-r-primary mr-1" />
                </div>
              </div>
            </>
          )}
          {(!url || (!isImage && !isVideo)) && (
            <div className="h-full grid place-items-center text-muted-foreground p-4 text-center">
              <div>
                <cat.icon className="h-10 w-10 mx-auto mb-2 text-primary/60" />
                {item.type === "note" && item.description && <p className="text-xs line-clamp-4">{item.description}</p>}
              </div>
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1.5">
            <button onClick={remove} aria-label="حذف" className="p-1.5 rounded-full bg-white/95 shadow-card active:scale-95 transition">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
            <button onClick={move} aria-label="نقل" className="p-1.5 rounded-full bg-white/95 shadow-card active:scale-95 transition">
              <Move className="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/95 text-foreground/80 shadow-card">{cat.label}</span>
        </div>
        <div className="p-3">
          <p className="font-bold text-sm truncate">{item.title || "بدون عنوان"}</p>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            {item.item_date && <p className="text-xs text-muted-foreground">📅 {item.item_date}</p>}
            {child && <p className="text-xs text-primary font-bold truncate">{child.name}</p>}
          </div>
          {ageStr && <p className="text-[11px] text-muted-foreground mt-0.5">🎂 {ageStr}</p>}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.slice(0, 3).map((t) => (
                <span key={t} onClick={(e) => { e.stopPropagation(); onTagClick(t); }}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold hover:bg-primary/20 cursor-pointer">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>
    </button>
  );
}
