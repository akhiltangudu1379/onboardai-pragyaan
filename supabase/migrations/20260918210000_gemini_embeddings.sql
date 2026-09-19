-- Switch embedding dimension from 1536 (OpenAI ada-002) to 768 (Gemini text-embedding-004)
-- Safe: all document_chunks.embedding values are currently NULL (seeded without embeddings)

-- 1. Drop existing vector index if any
DROP INDEX IF EXISTS document_chunks_embedding_idx;

-- 2. Drop the old 1536-dim match function
DROP FUNCTION IF EXISTS match_document_chunks(vector(1536), float, int);

-- 3. Change column type to 768 dims
--    Works when all values are NULL (no USING clause needed)
ALTER TABLE document_chunks
  ALTER COLUMN embedding TYPE vector(768);

-- 4. Recreate match function for 768-dim vectors
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.25,
  match_count int DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  section_label text,
  similarity float,
  document_title text,
  document_type text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.section_label,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.title AS document_title,
    d.type AS document_type
  FROM document_chunks dc
  INNER JOIN documents d ON dc.document_id = d.id
  WHERE dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION match_document_chunks(vector, float, int) TO anon, authenticated;

-- 5. HNSW index works at any table size (IVFFlat requires >= 100 non-NULL rows)
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks USING hnsw (embedding vector_cosine_ops);
