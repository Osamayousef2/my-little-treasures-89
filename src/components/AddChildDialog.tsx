import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const CHILD_COLORS = [
  { key: "pink", label: "وردي", cls: "from-pink-300 to-pink-500" },
  { key: "mint", label: "أخضر فاتح", cls: "from-emerald-300 to-emerald-500" },
  { key: "sky", label: "سماوي", cls: "from-sky-300 to-sky-500" },
  { key: "sun", label: "أصفر شمسي", cls: "from-amber-300 to-amber-500" },
  { key: "lilac", label: "بنفسجي", cls: "from-purple-300 to-purple-500" },
];

export const colorOf = (key: string | null) =>
  CHILD_COLORS.find((c) => c.key === key) ?? CHILD_COLORS[0];

export function AddChildDialog({ userId, onAdded, trigger }: {
  userId: string;
  onAdded: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [color, setColor] = useState("pink");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("children").insert({
      user_id: userId, name, birth_date: birth || null, color,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`أهلاً ${name} 💖`);
    setOpen(false); setName(""); setBirth(""); setColor("pink");
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="rounded-full"><Plus className="h-4 w-4 ml-1" /> إضافة طفل</Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle>طفل جديد ✨</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="cname">الاسم</Label>
            <Input id="cname" required value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label htmlFor="cbirth">تاريخ الميلاد (اختياري)</Label>
            <Input id="cbirth" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label>اللون المفضل</Label>
            <div className="flex gap-2 mt-2">
              {CHILD_COLORS.map((c) => (
                <button key={c.key} type="button" onClick={() => setColor(c.key)}
                  aria-label={`اختيار اللون ${c.label}`}
                  aria-pressed={color === c.key}
                  className={`h-10 w-10 rounded-full bg-gradient-to-br ${c.cls} ${color === c.key ? "ring-4 ring-foreground/30" : ""}`} />
              ))}
            </div>
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-xl h-11 font-bold">
            {busy ? "..." : "حفظ"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
