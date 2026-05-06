import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Sparkles, LogOut, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Child = {
  id: string; name: string; birth_date: string | null;
  avatar_url: string | null; color: string | null;
};

const COLORS = [
  { key: "pink", cls: "from-pink-300 to-pink-500", bg: "bg-[--pink]" },
  { key: "mint", cls: "from-emerald-300 to-emerald-500", bg: "bg-[--mint]" },
  { key: "sky", cls: "from-sky-300 to-sky-500", bg: "bg-[--sky]" },
  { key: "sun", cls: "from-amber-300 to-amber-500", bg: "bg-[--sun]" },
  { key: "lilac", cls: "from-purple-300 to-purple-500", bg: "bg-[--lilac]" },
];

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [color, setColor] = useState("pink");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("children").select("*").order("created_at").then(({ data }) => {
      setChildren((data as Child[]) ?? []);
    });
  }, [user]);

  const addChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { data, error } = await supabase.from("children").insert({
      user_id: user.id, name, birth_date: birth || null, color,
    }).select().single();
    if (error) return toast.error(error.message);
    setChildren((c) => [...c, data as Child]);
    setOpen(false); setName(""); setBirth(""); setColor("pink");
    toast.success(`أهلاً ${data!.name} 💖`);
  };

  const removeChild = async (id: string) => {
    if (!confirm("متأكد إنك عايز تحذف الألبوم ده؟")) return;
    const { error } = await supabase.from("children").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setChildren((c) => c.filter((x) => x.id !== id));
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-hero shadow-soft flex items-center justify-center">
            <Sparkles className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ألبوم بنتي</h1>
            <p className="text-xs text-muted-foreground">ذكريات وإبداعات</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} className="rounded-full">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-1">الأطفال</h2>
        <p className="text-sm text-muted-foreground">اختار طفل عشان تشوف الألبوم بتاعه</p>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {children.map((c) => {
          const col = COLORS.find((x) => x.key === c.color) ?? COLORS[0];
          return (
            <Link key={c.id} to="/child/$id" params={{ id: c.id }}>
              <Card className="group relative aspect-square rounded-3xl border-2 border-primary/10 overflow-hidden bg-gradient-card shadow-soft hover:shadow-pop transition-all hover:-translate-y-1 cursor-pointer p-0">
                <div className={`absolute inset-0 bg-gradient-to-br ${col.cls} opacity-30`} />
                <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
                  <div className={`h-20 w-20 rounded-full bg-gradient-to-br ${col.cls} flex items-center justify-center text-3xl font-bold text-white shadow-soft mb-3`}>
                    {c.name.slice(0, 1)}
                  </div>
                  <h3 className="font-bold text-lg">{c.name}</h3>
                  <Heart className="h-4 w-4 text-primary mt-1" />
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); removeChild(c.id); }}
                  className="absolute top-2 left-2 p-1.5 rounded-full bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </Card>
            </Link>
          );
        })}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="aspect-square rounded-3xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-primary transition-colors">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="h-7 w-7" />
              </div>
              <span className="font-bold">إضافة طفل</span>
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>طفل جديد ✨</DialogTitle>
            </DialogHeader>
            <form onSubmit={addChild} className="space-y-4">
              <div>
                <Label htmlFor="name">الاسم</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label htmlFor="birth">تاريخ الميلاد (اختياري)</Label>
                <Input id="birth" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>اللون المفضل</Label>
                <div className="flex gap-2 mt-2">
                  {COLORS.map((c) => (
                    <button key={c.key} type="button" onClick={() => setColor(c.key)}
                      className={`h-10 w-10 rounded-full bg-gradient-to-br ${c.cls} ${color === c.key ? "ring-4 ring-foreground/30" : ""}`} />
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl h-11 font-bold">حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {children.length === 0 && (
        <p className="text-center text-muted-foreground mt-12 text-sm">
          ابدأ بإضافة أول طفل وألبومه 💝
        </p>
      )}
    </div>
  );
}
