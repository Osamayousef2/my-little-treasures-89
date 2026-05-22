// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageDataUrl, category, occasion, occasionLabel, knownTags } = await req.json();
    if (!imageDataUrl) {
      return new Response(JSON.stringify({ error: "imageDataUrl required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const occText = occasionLabel || occasion;
    const sys = `أنت مساعد لتوثيق ألبوم ذكريات أطفال عائلي بالعربية. حلّل الصورة واستنتج:
- عنوان قصير (٢-٦ كلمات) باللهجة الفصحى البسيطة
- وصف قصير من جملة أو جملتين يصف اللحظة
- ٣ إلى ٦ وسوم قصيرة (كلمة واحدة أو كلمتين) بدون رمز #
الفئة: ${category ?? "غير محددة"}.
${occText ? `المناسبة: ${occText}. اجعل العنوان والوصف والوسوم متوافقة مع طابع هذه المناسبة، وأضف وسماً يدل عليها عند الملاءمة.` : ""}
${knownTags?.length ? `استخدم وسوماً موجودة سابقاً عند ملاءمتها: ${knownTags.join("، ")}.` : ""}
أرجع النتيجة عبر استدعاء الأداة فقط.`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        {
          role: "user",
          content: [
            { type: "text", text: "اقترح تفاصيل هذه الذكرى." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "suggest_memory",
          description: "Return suggested title, description and tags",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              tags: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
            },
            required: ["title", "description", "tags"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "suggest_memory" } },
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      if (r.status === 429) return new Response(JSON.stringify({ error: "تم تجاوز حد الاستخدام، حاول لاحقاً." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "الرصيد منتهي، يرجى إضافة رصيد لمساحة العمل." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await r.text();
      console.error("AI error:", r.status, t);
      return new Response(JSON.stringify({ error: "فشل الاقتراح" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await r.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;
    if (!args) throw new Error("no tool result");

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
