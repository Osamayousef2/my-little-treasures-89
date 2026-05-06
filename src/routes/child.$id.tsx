import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRight, Plus, Palette, Award, Camera, Video, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ItemType = "drawing" | "certificate" | "photo" | "video";
type Item = {
  id: string; type: ItemType; title: string | null; description: string | null;
  file_url: string; thumbnail_url: string | null; item_date: string | null;
};
type Child = { id: string; name: string; color: string | null };

const TABS: { key: ItemType; label: string; icon: typeof Palette }[] = [
  { key: "drawing", label: "الرسومات", icon: Palette },
  { key: "certificate", label: "الشهادات", icon: Award },
  { key: "photo", label: "الصور", icon: Camera },
  { key: "video", label: "الفيديوهات", icon: Video },
];

export const Route = createFileRoute("/child/$id")({
  component: ChildPage,
});

function ChildPage() {
  const { id } = useParams({ from: "/child/$id" });
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<ItemType>("drawing");
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const load = useCallback(async () => {
    const { data: c } = await supabase.from("children").select("id,name,color").eq("id", id).maybeSingle();
    setChild(c as Child | null);
    const { data: it } = await supabase.from("album_items").select("*").eq("child_id", id).order("created_at", { ascending: false });
    setItems((it as Item[]) ?? []);
  }, [id]);

  useEffect(() => { if (user) load(); }, [user, load]);

  // Sign URLs for files
  useEffect(() => {
    const missing = items.filter((i) => !signed[i.id]);
    if (missing.length === 0) return;
    (async () => {
      const updates: Record<string, string> = {};
      for (const it of missing) {
        const path = it.file_url;
        const { data } = await supabase.storage.from("album").createSignedUrl(path, 3600);
        if (data?.signedUrl) updates[it.id] = data.signedUrl;
      }
      setSigned((s) => ({ ...s, ...updates }));
    })();
  }, [items, signed]);

  const remove = async (it: Item) => {
    if (!confirm("حذف العنصر ده؟")) return;
    await supabase.storage.from("album").remove([it.file_url]);
    await supabase.from("album_items").delete().eq("id", it.id);
    setItems((arr) => arr.filter((x) => x.id !== it.id));
  };

  if (loading || !user || !child) return null;

  const filtered = items.filter((i) => i.type === tab);

  return (
    <div className="min-h-screen px-4 py-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> الرجوع
        </Link>
        <h1 className="text-xl font-bold">ألبوم {child.name} 💖</h1>
        <div className="w-16" />
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ItemType)}>
        <TabsList className="grid grid-cols-4 w-full bg-card rounded-2xl p-1 h-auto shadow-soft">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="rounded-xl flex flex-col gap-1 py-2 data-[state=active]:bg-gradient-hero data-[state=active]:text-white">
              <t.icon className="h-4 w-4" />
              <span className="text-xs">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">{t.label}</h2>
              <UploadDialog childId={id} type={t.key} onDone={load} />
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <t.icon className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">لسه مفيش حاجة. ابدأ بإضافة أول {t.label.slice(2)}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map((it) => (
                  <Card key={it.id} className="group relative overflow-hidden rounded-2xl border-2 border-primary/10 shadow-soft hover:shadow-pop transition-all bg-card p-0">
                    <div className="aspect-square bg-muted relative">
                      {signed[it.id] && (
                        it.type === "video"
                          ? <video src={signed[it.id]} className="w-full h-full object-cover" controls />
                          : <img src={signed[it.id]} alt={it.title ?? ""} className="w-full h-full object-cover" />
                      )}
                      <button onClick={() => remove(it)} className="absolute top-2 left-2 p-1.5 rounded-full bg-white/90 opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                    {(it.title || it.item_date) && (
                      <div className="p-2.5">
                        {it.title && <p className="font-bold text-sm truncate">{it.title}</p>}
                        {it.item_date && <p className="text-xs text-muted-foreground">{it.item_date}</p>}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function UploadDialog({ childId, type, onDone }: { childId: string; type: ItemType; onDone: () => void }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;
    setBusy(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${childId}/${type}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("album").upload(path, file);
    if (upErr) { setBusy(false); return toast.error(upErr.message); }
    const { error } = await supabase.from("album_items").insert({
      user_id: user.id, child_id: childId, type, title: title || null,
      description: desc || null, file_url: path, item_date: date || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم الإضافة 🎉");
    setOpen(false); setFile(null); setTitle(""); setDesc(""); setDate("");
    onDone();
  };

  const accept = type === "video" ? "video/*" : "image/*";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full shadow-soft font-bold">
          <Plus className="h-4 w-4 ml-1" /> إضافة
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle>إضافة جديد ✨</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="file">الملف</Label>
            <Input id="file" type="file" accept={accept} required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label htmlFor="t">العنوان (اختياري)</Label>
            <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label htmlFor="d">وصف (اختياري)</Label>
            <Textarea id="d" value={desc} onChange={(e) => setDesc(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label htmlFor="dt">التاريخ</Label>
            <Input id="dt" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-xl h-11 font-bold">
            {busy ? "جاري الرفع..." : "حفظ"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
