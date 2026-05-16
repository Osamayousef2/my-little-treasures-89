import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CHILD_COLORS } from "./AddChildDialog";
import type { Child } from "@/lib/useChildren";

export function EditChildDialog({ child, onSaved, trigger }: {
  child: Child;
  onSaved: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(child.name);
  const [birth, setBirth] = useState(child.birth_date ?? "");
  const [color, setColor] = useState(child.color ?? "pink");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("children").update({
      name, birth_date: birth || null, color,
    }).eq("id", child.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم التحديث 💛");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="rounded-full"><Pencil className="h-3.5 w-3.5 ml-1" /> تعديل</Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle>تعديل بيانات الطفل ✏️</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="ename">الاسم</Label>
            <Input id="ename" required value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label htmlFor="ebirth">تاريخ الميلاد</Label>
            <Input id="ebirth" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className="rounded-xl mt-1" />
            <p className="text-xs text-muted-foreground mt-1">يستخدم لحساب العمر تلقائياً في كل ذكرى</p>
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
            {busy ? "..." : "حفظ التعديلات"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
