import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export function TagsInput({ value, onChange, placeholder, suggestions = [] }: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const t = raw.trim().replace(/^#/, "");
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
    setDraft("");
  };

  const remove = (t: string) => onChange(value.filter((x) => x !== t));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  const fresh = suggestions.filter((s) => !value.includes(s)).slice(0, 8);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 p-2 border-2 border-input rounded-xl bg-background min-h-11 focus-within:border-primary transition">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            #{t}
            <button type="button" onClick={() => remove(t)} className="hover:bg-primary/20 rounded-full p-0.5" aria-label="حذف">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft && add(draft)}
          placeholder={value.length === 0 ? (placeholder ?? "اكتب وسماً واضغط Enter") : ""}
          className="flex-1 min-w-[120px] border-0 shadow-none h-7 p-0 focus-visible:ring-0"
        />
      </div>
      {fresh.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground">مقترحة:</span>
          {fresh.map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              className="text-xs px-2 py-0.5 rounded-full bg-muted hover:bg-accent transition">
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
