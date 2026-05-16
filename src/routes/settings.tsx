import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMemories } from "@/lib/useMemories";
import { LogOut, Shield, Database } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — ألبوم بنتي" },
      { name: "description", content: "إدارة حسابك ومعلومات الخصوصية في ألبوم بنتي." },
      { property: "og:title", content: "الإعدادات — ألبوم بنتي" },
      { property: "og:description", content: "إدارة الحساب والخصوصية." },
      { property: "og:url", content: "https://my-kiddo-album.lovable.app/settings" },
    ],
    links: [{ rel: "canonical", href: "https://my-kiddo-album.lovable.app/settings" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  const { items } = useMemories(user?.id);

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };
  if (loading || !user) return null;

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-1">الإعدادات</h1>
      <p className="text-sm text-muted-foreground mb-6">معلومات الحساب والخصوصية</p>

      <div className="space-y-3 max-w-xl">
        <Card className="p-5 shadow-card">
          <p className="text-xs text-muted-foreground">الحساب</p>
          <p className="font-semibold mt-1 break-all">{user.email}</p>
        </Card>

        <Card className="p-5 shadow-card flex items-center gap-3">
          <Database className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">{items.length} ذكرى محفوظة</p>
            <p className="text-xs text-muted-foreground">آمنة في مساحتك الخاصة</p>
          </div>
        </Card>

        <Card className="p-5 shadow-card flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-semibold">الخصوصية</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              هذا الأرشيف خاص بك بالكامل. لا توجد مشاركة عامة، ولا يستطيع أحد رؤية ذكرياتك إلا أنت من خلال حسابك.
            </p>
          </div>
        </Card>

        <Button variant="outline" onClick={signOut} className="w-full rounded-lg h-11">
          <LogOut className="h-4 w-4 ml-2" /> تسجيل الخروج
        </Button>
      </div>
    </AppShell>
  );
}
