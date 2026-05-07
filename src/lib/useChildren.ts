import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Child = {
  id: string; name: string; birth_date: string | null;
  color: string | null; avatar_url: string | null;
};

export function useChildren(userId: string | undefined) {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("children").select("*").order("created_at");
    setChildren((data as Child[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);
  return { children, loading, reload };
}
