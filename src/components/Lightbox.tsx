import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSignedUrl } from "@/lib/useMemories";
import type { Memory } from "@/lib/useMemories";
import type { Child } from "@/lib/useChildren";
import { categoryOf } from "@/lib/categories";
import { ageAt } from "@/lib/age";
import { ChevronLeft, ChevronRight, Download, Crop } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ImageCropDialog } from "./ImageCropDialog";

export function Lightbox({ items, index, onClose, onIndex, childMap = {}, onUpdated }: {
  items: Memory[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
  childMap?: Record<string, Child>;
  onUpdated?: () => void;
}) {
  const [cropOpen, setCropOpen] = useState(false);
  const [bust, setBust] = useState(0);
  const open = index >= 0 && index < items.length;
  const item = open ? items[index] : null;
  const url = useSignedUrl(item?.file_url ?? null);
  const cat = item ? categoryOf(item.type) : null;
  const isImage = item && ["drawing", "certificate", "photo", "school"].includes(item.type);
  const isVideo = item?.type === "video";
  const child = item?.child_id ? childMap[item.child_id] : null;
  const ageStr = ageAt(child?.birth_date, item?.item_date);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onIndex(Math.min(items.length - 1, index + 1));
      if (e.key === "ArrowRight") onIndex(Math.max(0, index - 1));
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, items.length, onIndex, onClose]);

  const download = async () => {
    if (!item?.file_url) return;
    const { data } = await supabase.storage.from("album").download(item.file_url);
    if (!data) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(data);
    a.download = item.title || item.file_url.split("/").pop() || "memory";
    a.click();
  };

  if (!open || !item || !cat) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden rounded-3xl border-4 border-white shadow-pop bg-card">
        <div className="relative bg-gradient-to-br from-muted to-card">
          <div className="flex items-center justify-center min-h-[60vh] max-h-[80vh] p-4">
            {url && isImage && <img src={url} alt={item.title ?? ""} className="max-h-[75vh] max-w-full object-contain rounded-xl" />}
            {url && isVideo && <video src={url} controls autoPlay className="max-h-[75vh] max-w-full rounded-xl" />}
            {!isImage && !isVideo && (
              <div className="text-center p-8">
                <cat.icon className="h-20 w-20 mx-auto text-primary mb-4" />
                {item.file_url && (
                  <a href={url ?? "#"} target="_blank" rel="noreferrer" className="text-primary underline">فتح الملف</a>
                )}
              </div>
            )}
          </div>

          {index > 0 && (
            <button onClick={() => onIndex(index - 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 shadow-soft grid place-items-center hover:bg-card">
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          {index < items.length - 1 && (
            <button onClick={() => onIndex(index + 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 shadow-soft grid place-items-center hover:bg-card">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-5 border-t border-border bg-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs text-primary font-bold">{cat.label}</span>
              <h3 className="text-lg font-bold truncate">{item.title || "بدون عنوان"}</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                {item.item_date && <span>📅 {item.item_date}</span>}
                {child && <span className="text-primary font-bold">👶 {child.name}</span>}
                {ageStr && <span>🎂 {ageStr}</span>}
              </div>
            </div>
            {item.file_url && (
              <button onClick={download} className="shrink-0 h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-soft">
                <Download className="h-3.5 w-3.5" /> تحميل
              </button>
            )}
          </div>
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {item.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">#{t}</span>
              ))}
            </div>
          )}
          {item.description && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{item.description}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
