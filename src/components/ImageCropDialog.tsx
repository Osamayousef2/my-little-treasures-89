import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCw, Save, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

async function getCroppedBlob(imageSrc: string, area: Area, rotation: number, mime: string): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc;
  });
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad));
  const bW = img.width * cos + img.height * sin;
  const bH = img.width * sin + img.height * cos;

  const canvas = document.createElement("canvas");
  canvas.width = bW; canvas.height = bH;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(bW / 2, bH / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  const out = document.createElement("canvas");
  out.width = area.width; out.height = area.height;
  const octx = out.getContext("2d")!;
  octx.drawImage(canvas, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);

  return new Promise((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error("crop failed"))), mime, 0.92)
  );
}

export function ImageCropDialog({ open, onOpenChange, src, path, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  src: string;
  path: string;
  onSaved: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const save = async () => {
    if (!area) return;
    setBusy(true);
    try {
      const ext = (path.split(".").pop() || "jpg").toLowerCase();
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      const blob = await getCroppedBlob(src, area, rotation, mime);
      const { error } = await supabase.storage.from("album").update(path, blob, {
        contentType: mime, upsert: true, cacheControl: "0",
      });
      if (error) throw error;
      toast.success("تم حفظ التعديل ✂️");
      onSaved();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>تعديل الصورة ✂️</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-[60vh] bg-black/90">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onComplete}
            restrictPosition={false}
          />
        </div>
        <div className="p-4 space-y-3 bg-card">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">تكبير</label>
            <Slider min={1} max={4} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(v[0])} />
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" className="rounded-full"
              onClick={() => setRotation((r) => (r + 90) % 360)}>
              <RotateCw className="h-4 w-4 ml-1" /> تدوير
            </Button>
            <Button type="button" disabled={busy || !area} onClick={save} className="flex-1 rounded-xl h-11 font-bold">
              <Save className="h-4 w-4 ml-2" /> {busy ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
