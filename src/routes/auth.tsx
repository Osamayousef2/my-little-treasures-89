import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "دخول - ألبوم بنتي" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fn = mode === "signup"
      ? supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : supabase.auth.signInWithPassword({ email, password });
    const { error } = await fn;
    setLoading(false);
    if (error) return toast.error(error.message);
    if (mode === "signup") toast.success("تم إنشاء الحساب! يلا نبدأ 🎉");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-8 bg-gradient-card shadow-pop rounded-3xl border-2 border-primary/20">
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-hero shadow-soft mb-3">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">ألبوم بنتي</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "signin" ? "أهلاً بعودتك 👋" : "ابدأ ألبوم ذكرياتك ✨"}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label htmlFor="password">كلمة المرور</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-xl h-12 text-base font-bold shadow-soft">
            {loading ? "..." : mode === "signin" ? "دخول" : "إنشاء حساب"}
          </Button>
        </form>
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full text-center text-sm text-muted-foreground hover:text-primary mt-4">
          {mode === "signin" ? "ماعندكش حساب؟ سجل دلوقتي" : "عندك حساب؟ ادخل"}
        </button>
      </Card>
    </div>
  );
}
