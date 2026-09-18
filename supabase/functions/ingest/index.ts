import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_CONTENT_LENGTH = 5 * 1024 * 1024; // 5 MB
const MAX_CHUNKS = 60;
const CHUNK_TARGET_CHARS = 1200;

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("LLM_API_KEY");
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        input: text.slice(0, 8000),
        model: Deno.env.get("EMBEDDING_MODEL") || "text-embedding-ada-002",
      }),
    });
    if (!res.ok) { console.error("Embedding error:", res.status); return null; }
    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch (e) { console.error("Embedding call failed:", e); return null; }
}

function chunkDocument(content: string, title: string): { content: string; section_label: string }[] {
  const chunks: { content: string; section_label: string }[] = [];

  // Split by markdown headers
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
        // Split large sections by paragraph
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
        if (current.trim().length > 20) {
          chunks.push({ content: current.trim(), section_label: `${sectionLabel} (${idx})` });
        }
      }
    }
  } else {
    // Plain text: chunk by approximate size
    const words = content.split(/\s+/);
    let current = "";
    let idx = 1;
    for (const word of words) {
      if (current.length > 0 && (current + " " + word).length > CHUNK_TARGET_CHARS) {
        chunks.push({ content: current.trim(), section_label: `${title} - Part ${idx}` });
        // Overlap: keep last ~30 words
        const overlap = current.split(/\s+/).slice(-30).join(" ");
        current = overlap + " " + word;
        idx++;
      } else {
        current = current ? current + " " + word : word;
      }
    }
    if (current.trim().length > 20) {
      chunks.push({ content: current.trim(), section_label: `${title} - Part ${idx}` });
    }
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

    // Check for duplicate by title
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

    // Insert document (status = processing)
    const uploadDate = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const { data: doc, error: docError } = await sb
      .from("documents")
      .insert({
        title: title.trim(),
        type: docType,
        size: size || `${Math.max(1, Math.round(content.length / 1024))} KB`,
        upload_date: uploadDate,
        status: "processing",
        sections: 0,
        content,
      })
      .select()
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: docError?.message || "Failed to create document" }), { status: 500, headers: corsHeaders });
    }

    // Chunk document
    const chunks = chunkDocument(content, title.trim());
    const hasApiKey = !!Deno.env.get("LLM_API_KEY");
    let embeddingsGenerated = 0;
    let chunkErrors = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = hasApiKey ? await generateEmbedding(chunk.content) : null;

      const { error: chunkErr } = await sb.from("document_chunks").insert({
        document_id: doc.id,
        chunk_index: i,
        content: chunk.content,
        section_label: chunk.section_label,
        embedding: embedding ? JSON.stringify(embedding) : null,
      });

      if (chunkErr) {
        console.error(`Chunk ${i} error:`, chunkErr.message);
        chunkErrors++;
      } else if (embedding) {
        embeddingsGenerated++;
      }
    }

    // Update document status
    await sb.from("documents").update({ status: "indexed", sections: chunks.length }).eq("id", doc.id);

    return new Response(
      JSON.stringify({
        documentId: doc.id,
        title: title.trim(),
        sections: chunks.length,
        embeddingsGenerated,
        chunkErrors,
        vectorSearchEnabled: embeddingsGenerated > 0,
        mode: hasApiKey ? "ai" : "demo",
        message: hasApiKey
          ? `Indexed ${chunks.length} sections with ${embeddingsGenerated} semantic embeddings`
          : `Indexed ${chunks.length} sections (keyword search only — set LLM_API_KEY for semantic RAG)`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Ingest error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
