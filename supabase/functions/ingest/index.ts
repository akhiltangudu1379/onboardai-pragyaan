import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_CONTENT_LENGTH = 5 * 1024 * 1024;
const MAX_CHUNKS = 60;
const CHUNK_TARGET_CHARS = 1200;

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// Gemini text-embedding-004 — 768 dims (matches vector(768) column after migration)
async function geminiEmbed(apiKey: string, text: string): Promise<number[] | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: text.slice(0, 8000) }] },
        taskType: "RETRIEVAL_DOCUMENT",
      }),
    });
    if (!res.ok) { console.error("Gemini embed error:", res.status); return null; }
    const data = await res.json();
    return (data.embedding?.values as number[]) || null;
  } catch { return null; }
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  // Prefer Gemini (768 dims — matches current DB vector(768))
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) return geminiEmbed(geminiKey, text);

  // OpenAI ada-002 produces 1536 dims — incompatible with vector(768) after migration.
  // Skip to avoid dimension mismatch errors.
  if (Deno.env.get("LLM_API_KEY")) {
    console.warn("OpenAI embeddings are 1536 dims; DB column is vector(768). Skipping embedding — use GEMINI_API_KEY for semantic RAG.");
    return null;
  }

  return null;
}

function chunkDocument(content: string, title: string): { content: string; section_label: string }[] {
  const chunks: { content: string; section_label: string }[] = [];
  const headerSections = content.split(/\n(?=#{1,3}\s)/);

  if (headerSections.length > 1) {
    for (const section of headerSections) {
      const trimmed = section.trim();
      if (trimmed.length < 20) continue;
      const lines = trimmed.split("\n");
      const headerMatch = lines[0]?.match(/^#{1,3}\s+(.+)/);
      const sectionLabel = headerMatch ? headerMatch[1].trim() : title;

      if (trimmed.length <= CHUNK_TARGET_CHARS) {
        chunks.push({ content: trimmed, section_label: sectionLabel });
      } else {
        const paragraphs = trimmed.split(/\n\n+/);
        let current = "";
        let idx = 1;
        for (const para of paragraphs) {
          if (current.length > 0 && (current + "\n\n" + para).length > CHUNK_TARGET_CHARS) {
            chunks.push({ content: current.trim(), section_label: `${sectionLabel} (${idx})` });
            current = para;
            idx++;
          } else {
            current = current ? current + "\n\n" + para : para;
          }
        }
        if (current.trim().length > 20) chunks.push({ content: current.trim(), section_label: `${sectionLabel} (${idx})` });
      }
    }
  } else {
    const words = content.split(/\s+/);
    let current = "";
    let idx = 1;
    for (const word of words) {
      if (current.length > 0 && (current + " " + word).length > CHUNK_TARGET_CHARS) {
        chunks.push({ content: current.trim(), section_label: `${title} - Part ${idx}` });
        current = current.split(/\s+/).slice(-30).join(" ") + " " + word;
        idx++;
      } else {
        current = current ? current + " " + word : word;
      }
    }
    if (current.trim().length > 20) chunks.push({ content: current.trim(), section_label: `${title} - Part ${idx}` });
  }

  return chunks.filter((c) => c.content.trim().length > 20).slice(0, MAX_CHUNKS);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const sb = getSupabase();
    const body = await req.json();
    const { title, content, type, size } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return new Response(JSON.stringify({ error: "title is required" }), { status: 400, headers: corsHeaders });
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "content is required" }), { status: 400, headers: corsHeaders });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return new Response(JSON.stringify({ error: "Content too large (max 5 MB)" }), { status: 400, headers: corsHeaders });
    }

    const allowedTypes = ["txt", "md", "markdown", "text"];
    const docType = (type || "TXT").toUpperCase();
    if (!allowedTypes.includes((type || "txt").toLowerCase())) {
      return new Response(JSON.stringify({ error: `Unsupported file type: ${type}. Supported: TXT, MD, Markdown` }), { status: 400, headers: corsHeaders });
    }

    const { data: existing } = await sb
      .from("documents")
      .select("id")
      .ilike("title", title.trim())
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: `A document named "${title}" already exists. Delete it first or use a different name.`, duplicate: true, documentId: existing.id }),
        { status: 409, headers: corsHeaders },
      );
    }

    const uploadDate = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const { data: doc, error: docError } = await sb
      .from("documents")
      .insert({
        title: title.trim(), type: docType,
        size: size || `${Math.max(1, Math.round(content.length / 1024))} KB`,
        upload_date: uploadDate, status: "processing", sections: 0, content,
      })
      .select()
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: docError?.message || "Failed to create document" }), { status: 500, headers: corsHeaders });
    }

    const chunks = chunkDocument(content, title.trim());
    const hasGemini = !!Deno.env.get("GEMINI_API_KEY");
    let embeddingsGenerated = 0;
    let chunkErrors = 0;

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i].content);
      const { error: chunkErr } = await sb.from("document_chunks").insert({
        document_id: doc.id, chunk_index: i,
        content: chunks[i].content, section_label: chunks[i].section_label,
        embedding: embedding ? JSON.stringify(embedding) : null,
      });
      if (chunkErr) { console.error(`Chunk ${i} error:`, chunkErr.message); chunkErrors++; }
      else if (embedding) embeddingsGenerated++;
    }

    await sb.from("documents").update({ status: "indexed", sections: chunks.length }).eq("id", doc.id);

    const provider = hasGemini ? "Gemini text-embedding-004" : "none";
    return new Response(
      JSON.stringify({
        documentId: doc.id, title: title.trim(), sections: chunks.length,
        embeddingsGenerated, chunkErrors,
        vectorSearchEnabled: embeddingsGenerated > 0,
        provider,
        mode: hasGemini ? "ai" : "demo",
        message: hasGemini
          ? `Indexed ${chunks.length} sections with ${embeddingsGenerated} Gemini semantic embeddings (768 dims)`
          : `Indexed ${chunks.length} sections (keyword search only — add GEMINI_API_KEY secret for semantic RAG)`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Ingest error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
