import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Category } from "./categories";

export type Memory = {
  id: string;
  type: Category;
  title: string | null;
  description: string | null;
  file_url: string | null;
  item_date: string | null;
  child_id: string | null;
  created_at: string;
  tags: string[];
};

export function useMemories(userId: string | undefined) {
  const [items, setItems] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("album_items")
      .select("id,type,title,description,file_url,item_date,child_id,created_at,tags")
      .order("item_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    setItems((data as Memory[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);
  return { items, loading, reload };
}

export function useSignedUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let active = true;
    supabase.storage.from("album").createSignedUrl(path, 3600).then(({ data }) => {
      if (active) setUrl(data?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [path]);
  return url;
}
