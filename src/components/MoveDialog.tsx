import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CATEGORIES, type Category } from "@/lib/categories";
import { useChildren } from "@/lib/useChildren";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Memory } from "@/lib/useMemories";

export function MoveDialog({ open, onOpenChange, item, userId, onMoved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Memory | null;
  userId: string | undefined;
  onMoved: () => void;
}) {
  const { children } = useChildren(userId);
  const [child, setChild] = useState<string>("none");
  const [type, setType] = useState<Category | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && item) {
      setType(item.type);
      setChild(item.child_id ?? "none");
    }
  }, [open, item]);

  const save = async () => {
    if (!item) return;
    setSaving(true);
    const { error } = await supabase.from("album_items")
      .update({ type: type as Category, child_id: child === "none" ? null : child })
      .eq("id", item.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم النقل ✨");
    onMoved();
    onOpenChange(false);
    setType("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setType(""); }}>
      <DialogContent className="rounded-3xl max-w-sm">
        <DialogHeader>
          <DialogTitle>نقل الذكرى 🚚</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>الفئة (الألبوم)</Label>
            <Select value={type as string} onValueChange={(v) => setType(v as Category)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الطفل</Label>
            <Select value={child} onValueChange={setChild}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— بدون طفل —</SelectItem>
                {children.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">إلغاء</Button>
          <Button onClick={save} disabled={saving} className="rounded-full">{saving ? "جاري الحفظ..." : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
