import { Award, Palette, School, Camera, Video, StickyNote, type LucideIcon } from "lucide-react";

export type Category = "certificate" | "drawing" | "school" | "photo" | "video" | "note";

export const CATEGORIES: { key: Category; label: string; icon: LucideIcon; hint: string }[] = [
  { key: "certificate", label: "الشهادات", icon: Award, hint: "شهادات التقدير والإنجازات" },
  { key: "drawing", label: "الرسومات", icon: Palette, hint: "رسومات وأعمال فنية" },
  { key: "school", label: "المشاركات المدرسية", icon: School, hint: "أنشطة ومشاركات في المدرسة" },
  { key: "photo", label: "الصور", icon: Camera, hint: "لحظات وصور عائلية" },
  { key: "video", label: "الفيديوهات", icon: Video, hint: "مقاطع فيديو قصيرة" },
  { key: "note", label: "ملاحظات خاصة", icon: StickyNote, hint: "ذكريات وملاحظات مكتوبة" },
];

export const categoryOf = (k: string) => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[0];
