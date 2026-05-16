import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagsInput } from "./TagsInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Memory } from "@/lib/useMemories";

export function EditMemoryDialog({ open, onOpenChange, item, suggestions = [], onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Memory | null;
  suggestions?: string[];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemDate, setItemDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title ?? "");
    setDescription(item.description ?? "");
    setItemDate(item.item_date ?? "");
    setTags(item.tags ?? []);
  }, [item]);

  const save = async () => {
    if (!item) return;
    setBusy(true);
    const { error } = await supabase.from("album_items").update({
      title: title.trim() || null,
      description: description.trim() || null,
      item_date: itemDate || null,
      tags,
    }).eq("id", item.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ التعديل ✏️");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader><DialogTitle>تعديل الذكرى ✏️</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold mb-1 block">العنوان</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block">الوصف</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block">التاريخ</label>
            <Input type="date" value={itemDate} onChange={(e) => setItemDate(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block">الوسوم</label>
            <TagsInput value={tags} onChange={setTags} suggestions={suggestions} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button disabled={busy} onClick={save} className="rounded-full font-bold">
            {busy ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
