import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCw, Save, Undo2, Sticker, Crop as CropIcon, ChevronLeft, X, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STICKERS = ["⭐","❤️","🎉","🎂","🌈","🦄","🐱","🐶","🌸","🍓","🍭","👑","✨","🎈","🦋","🌟","💖","🐻","🐰","🐼","🍕","🌞"];

type Placed = { id: number; emoji: string; x: number; y: number; size: number };

async function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

async function getCroppedCanvas(imageSrc: string, area: Area, rotation: number): Promise<HTMLCanvasElement> {
  const img = await loadImg(imageSrc);
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
  return out;
}

export function ImageCropDialog({ open, onOpenChange, src, path, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  src: string;
  path: string;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<"crop" | "stickers">("crop");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDims, setPreviewDims] = useState<{ w: number; h: number } | null>(null);
  const [stickers, setStickers] = useState<Placed[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; offX: number; offY: number } | null>(null);
  const croppedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("crop"); setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0);
      setArea(null); setStickers([]); setSelectedId(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null); setPreviewDims(null);
      croppedCanvasRef.current = null;
    }
  }, [open, previewUrl]);

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const goToStickers = async () => {
    if (!area) return;
    setBusy(true);
    try {
      const canvas = await getCroppedCanvas(src, area, rotation);
      croppedCanvasRef.current = canvas;
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => b ? res(b) : rej(new Error("preview failed")), "image/png", 0.92)
      );
      const u = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(u);
      setPreviewDims({ w: canvas.width, h: canvas.height });
      setStep("stickers");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل");
    } finally { setBusy(false); }
  };

  const addSticker = (emoji: string) => {
    const id = Date.now() + Math.random();
    setStickers((s) => [...s, { id, emoji, x: 0.5, y: 0.5, size: 0.15 }]);
    setSelectedId(id);
  };

  const onStickerPointerDown = (e: React.PointerEvent, st: Placed) => {
    e.stopPropagation();
    const stage = stageRef.current; if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const cx = st.x * rect.width, cy = st.y * rect.height;
    dragRef.current = { id: st.id, offX: e.clientX - rect.left - cx, offY: e.clientY - rect.top - cy };
    setSelectedId(st.id);
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onStagePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d) return;
    const stage = stageRef.current; if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const nx = (e.clientX - rect.left - d.offX) / rect.width;
    const ny = (e.clientY - rect.top - d.offY) / rect.height;
    setStickers((s) => s.map((x) => x.id === d.id ? { ...x, x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) } : x));
  };
  const onStagePointerUp = () => { dragRef.current = null; };

  const resizeSelected = (delta: number) => {
    if (selectedId == null) return;
    setStickers((s) => s.map((x) => x.id === selectedId ? { ...x, size: Math.max(0.04, Math.min(0.6, x.size + delta)) } : x));
  };
  const removeSelected = () => {
    if (selectedId == null) return;
    setStickers((s) => s.filter((x) => x.id !== selectedId));
    setSelectedId(null);
  };

  const save = async () => {
    if (!area) return;
    setBusy(true);
    try {
      const ext = (path.split(".").pop() || "jpg").toLowerCase();
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      const canvas = croppedCanvasRef.current ?? await getCroppedCanvas(src, area, rotation);
      // bake stickers
      if (stickers.length) {
        const ctx = canvas.getContext("2d")!;
        for (const st of stickers) {
          const px = st.x * canvas.width;
          const py = st.y * canvas.height;
          const fontPx = st.size * Math.min(canvas.width, canvas.height);
          ctx.font = `${fontPx}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(st.emoji, px, py);
        }
      }
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => b ? res(b) : rej(new Error("crop failed")), mime, 0.92)
      );
      const { error } = await supabase.storage.from("album").update(path, blob, {
        contentType: mime, upsert: true, cacheControl: "0",
      });
      if (error) throw error;
      toast.success("تم حفظ التعديل ✂️✨");
      onSaved();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally { setBusy(false); }
  };

  const stageStyle = previewDims ? { aspectRatio: `${previewDims.w} / ${previewDims.h}` } : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{step === "crop" ? "قص الصورة ✂️" : "أضف ستيكرات ✨"}</DialogTitle>
        </DialogHeader>

        {step === "crop" ? (
          <>
            <div className="relative w-full h-[60vh] bg-black/90">
              <Cropper
                image={src} crop={crop} zoom={zoom} rotation={rotation} aspect={undefined}
                onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation}
                onCropComplete={onComplete} restrictPosition={false}
              />
            </div>
            <div className="p-4 space-y-3 bg-card">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">تكبير</label>
                <Slider min={1} max={4} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(v[0])} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button type="button" variant="outline" size="sm" className="rounded-full"
                  onClick={() => setRotation((r) => (r + 90) % 360)}>
                  <RotateCw className="h-4 w-4 ml-1" /> تدوير
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-full"
                  disabled={busy || (crop.x === 0 && crop.y === 0 && zoom === 1 && rotation === 0)}
                  onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0); }}>
                  <Undo2 className="h-4 w-4 ml-1" /> تراجع
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-full"
                  disabled={busy || !area} onClick={goToStickers}>
                  <Sticker className="h-4 w-4 ml-1" /> ستيكرات
                </Button>
                <Button type="button" disabled={busy || !area} onClick={save} className="flex-1 rounded-xl h-11 font-bold">
                  <Save className="h-4 w-4 ml-2" /> {busy ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-black/90 p-4 grid place-items-center">
              <div
                ref={stageRef}
                onPointerMove={onStagePointerMove}
                onPointerUp={onStagePointerUp}
                onPointerCancel={onStagePointerUp}
                onClick={() => setSelectedId(null)}
                className="relative w-full max-w-full max-h-[55vh] rounded-xl overflow-hidden touch-none select-none"
                style={{ ...stageStyle, containerType: "size" }}
              >
                {previewUrl && <img src={previewUrl} alt="" className="w-full h-full object-contain pointer-events-none" />}
                {stickers.map((st) => {
                  const stageW = stageRef.current?.clientWidth ?? 0;
                  const stageH = stageRef.current?.clientHeight ?? 0;
                  const px = st.size * Math.min(stageW, stageH);
                  return (
                    <div
                      key={st.id}
                      onPointerDown={(e) => onStickerPointerDown(e, st)}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(st.id); }}
                      className={`absolute cursor-grab active:cursor-grabbing leading-none ${selectedId === st.id ? "ring-2 ring-primary ring-offset-2 ring-offset-black/60 rounded-md" : ""}`}
                      style={{
                        left: `${st.x * 100}%`, top: `${st.y * 100}%`,
                        transform: "translate(-50%, -50%)",
                        fontSize: `${px}px`,
                      }}
                    >
                      {st.emoji}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 space-y-3 bg-card">
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {STICKERS.map((e) => (
                  <button key={e} type="button" onClick={() => addSticker(e)}
                    className="h-10 w-10 rounded-xl bg-muted hover:bg-accent text-2xl leading-none grid place-items-center transition active:scale-95">
                    {e}
                  </button>
                ))}
              </div>
              {selectedId != null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">المحدد:</span>
                  <Button type="button" size="icon" variant="outline" className="rounded-full h-8 w-8" onClick={() => resizeSelected(-0.02)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="outline" className="rounded-full h-8 w-8" onClick={() => resizeSelected(0.02)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-full text-destructive" onClick={removeSelected}>
                    <X className="h-4 w-4 ml-1" /> حذف
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setStep("crop")}>
                  <ChevronLeft className="h-4 w-4 ml-1" /> رجوع للقص
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-full"
                  disabled={busy || stickers.length === 0} onClick={() => { setStickers([]); setSelectedId(null); }}>
                  <Undo2 className="h-4 w-4 ml-1" /> مسح الستيكرات
                </Button>
                <Button type="button" disabled={busy} onClick={save} className="flex-1 rounded-xl h-11 font-bold">
                  <Save className="h-4 w-4 ml-2" /> {busy ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
