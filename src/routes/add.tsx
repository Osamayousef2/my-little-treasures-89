import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { CATEGORIES, type Category } from "@/lib/categories";
import { useChildren } from "@/lib/useChildren";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Upload, Sparkles } from "lucide-react";
import { TagsInput } from "@/components/TagsInput";
import { useMemories } from "@/lib/useMemories";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";

const searchSchema = z.object({
  category: fallback(z.enum(["certificate","drawing","school","photo","video","note"]), "photo").default("photo"),
});

export const Route = createFileRoute("/add")({
  head: () => ({
    meta: [
      { title: "إضافة ذكرى — ألبوم بنتي" },
      { name: "description", content: "أضف ذكرى جديدة: صورة، فيديو، رسمة، شهادة أو ملاحظة، مع اقتراح عنوان ووصف ووسوم بالذكاء الاصطناعي." },
      { property: "og:title", content: "إضافة ذكرى — ألبوم بنتي" },
      { property: "og:description", content: "أضف ذكرى جديدة مع اقتراح تلقائي للعنوان والوسوم بالذكاء الاصطناعي." },
      { property: "og:url", content: "https://my-kiddo-album.lovable.app/add" },
    ],
    links: [{ rel: "canonical", href: "https://my-kiddo-album.lovable.app/add" }],
  }),
  validateSearch: zodValidator(searchSchema),
  component: AddPage,
});

function AddPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const initial = Route.useSearch();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const [category, setCategory] = useState<Category>(initial.category);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [childId, setChildId] = useState<string>("none");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const { children } = useChildren(user?.id);
  const { items } = useMemories(user?.id);
  const allTags = Array.from(new Set(items.flatMap((i) => i.tags ?? []))).sort();

  if (loading || !user) return null;

  const fileRequired = category !== "note";
  const accept = category === "video" ? "video/*"
    : category === "note" ? "*/*"
    : category === "certificate" ? "image/*,application/pdf"
    : "image/*";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let path: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      path = `${user.id}/general/${category}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("album").upload(path, file);
      if (upErr) { setBusy(false); return toast.error(upErr.message); }
    } else if (fileRequired) {
      setBusy(false);
      return toast.error("يرجى اختيار ملف");
    }
    const { error } = await supabase.from("album_items").insert({
      user_id: user.id, type: category, title: title || null,
      description: desc || null, file_url: path, item_date: date || null,
      child_id: childId === "none" ? null : childId,
      tags,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ 💛");
    navigate({ to: "/album" });
  };

  const suggest = async () => {
    if (!file) return toast.error("اختر صورة أولاً");
    if (!file.type.startsWith("image/")) return toast.error("الاقتراح يعمل مع الصور فقط");
    setSuggesting(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("suggest-memory", {
        body: { imageDataUrl: dataUrl, category, knownTags: allTags.slice(0, 30) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.title && !title) setTitle(data.title);
      if (data?.description && !desc) setDesc(data.description);
      if (Array.isArray(data?.tags)) {
        const merged = Array.from(new Set([...(tags ?? []), ...data.tags]));
        setTags(merged);
      }
      toast.success("تم الاقتراح ✨");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "تعذّر الاقتراح");
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">إضافة ذكرى جديدة</h1>
        <p className="text-sm text-muted-foreground mb-6">احفظ لحظة تستحق التذكر</p>

        <Card className="p-5 shadow-card">
          <form onSubmit={submit} className="space-y-4" aria-labelledby="add-form-title">
            <h2 id="add-form-title" className="sr-only">نموذج إضافة ذكرى جديدة</h2>

            <div>
              <Label htmlFor="category" id="category-label">الفئة</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger id="category" aria-labelledby="category-label" className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      <span className="flex items-center gap-2"><c.icon className="h-4 w-4" aria-hidden="true" /> {c.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {children.length > 0 && (
              <div>
                <Label htmlFor="child" id="child-label">الطفل (اختياري)</Label>
                <Select value={childId} onValueChange={setChildId}>
                  <SelectTrigger id="child" aria-labelledby="child-label" className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— غير محدد —</SelectItem>
                    {children.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="title">العنوان</Label>
              <Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: شهادة التفوق - الصف الأول" className="mt-1.5" aria-describedby="title-hint" />
              <span id="title-hint" className="sr-only">عنوان مختصر يصف الذكرى</span>
            </div>

            <div>
              <Label htmlFor="date">التاريخ</Label>
              <Input id="date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
            </div>

            <div>
              <Label htmlFor="desc">الوصف / ملاحظات</Label>
              <Textarea id="desc" name="desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} placeholder="اكتب تفاصيل أو ذكرى مرتبطة بهذه اللحظة..." className="mt-1.5" aria-describedby="desc-hint" />
              <span id="desc-hint" className="sr-only">وصف تفصيلي اختياري للذكرى</span>
            </div>

            <div role="group" aria-labelledby="tags-label">
              <Label id="tags-label">الوسوم</Label>
              <div className="mt-1.5">
                <TagsInput value={tags} onChange={setTags} placeholder="مثلاً: عيد ميلاد، سفر، أول مرة" suggestions={allTags} />
              </div>
            </div>

            <div>
              <Label htmlFor="file">الملف {fileRequired ? "(مطلوب)" : "(اختياري)"}</Label>
              <label htmlFor="file" className="mt-1.5 flex items-center gap-3 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition">
                <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm text-muted-foreground truncate">{file ? file.name : "اختر صورة، فيديو، PDF أو ملف"}</span>
              </label>
              <input id="file" name="file" type="file" accept={accept} className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-required={fileRequired} />
              {file && file.type.startsWith("image/") && (
                <Button type="button" variant="outline" size="sm" onClick={suggest} disabled={suggesting}
                  aria-label="اقتراح عنوان ووصف ووسوم تلقائياً بالذكاء الاصطناعي"
                  className="mt-2 rounded-full">
                  <Sparkles className="h-4 w-4 ml-1" aria-hidden="true" />
                  {suggesting ? "جاري التحليل..." : "اقتراح تلقائي بالذكاء الاصطناعي"}
                </Button>
              )}
            </div>

            <Button type="submit" disabled={busy} className="w-full h-11 rounded-lg font-bold" aria-label={busy ? "جاري حفظ الذكرى" : "حفظ الذكرى"}>
              <Save className="h-4 w-4 ml-2" aria-hidden="true" /> {busy ? "جاري الحفظ..." : "حفظ الذكرى"}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
