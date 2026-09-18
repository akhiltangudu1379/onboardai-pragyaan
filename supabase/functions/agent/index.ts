import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEMO_USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// ─── Types ───
interface AgentEvent {
  icon: string; title: string; description: string;
  status: "processing" | "completed"; tool: string;
  detail: string; event_type: string;
}

interface SourceCitation {
  id: string; title: string; type: string; description: string; sectionContent?: string;
}

interface AgentResponse {
  greeting: string; summary: string;
  checklist: { id: string; label: string; done: boolean }[];
  workflow: { title: string; steps: { id: string; label: string; state: "pending" | "active" | "completed" }[]; requestId?: string; status?: string };
  sources: SourceCitation[];
  activity: AgentEvent[];
  taskUpdate?: { taskId: string; newStatus: string };
  accessRequest?: { requestId: string; approver: string; approverRole: string; status: string; isDuplicate?: boolean };
  mode: "ai" | "demo";
}

type ChunkResult = { content: string; section_label: string; document_title: string; similarity?: number };
type KnowledgeResult = { chunks: ChunkResult[]; sources: SourceCitation[]; usedVectorSearch: boolean };
type AccessRequestRecord = { requestId: string; approver: string; approverRole: string; status: string; resource: string; createdAt?: string };

interface Plan {
  intent: string;
  tools: string[];
  searchQuery?: string;
  contactQuery?: string;
  accessResource?: string;
  taskTitle?: string;
  taskStatus?: string;
}

// ─── Config ───
function getConfig() {
  return {
    llmApiKey: Deno.env.get("LLM_API_KEY") || "",
    llmModel: Deno.env.get("LLM_MODEL") || "gpt-4o-mini",
    embeddingModel: Deno.env.get("EMBEDDING_MODEL") || "text-embedding-ada-002",
  };
}

function getSupabase() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// ─── LLM ───
async function llmCall(
  messages: { role: string; content: string }[],
  opts?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }
): Promise<string | null> {
  const { llmApiKey, llmModel } = getConfig();
  if (!llmApiKey) return null;
  try {
    const body: Record<string, unknown> = {
      model: llmModel, messages,
      max_tokens: opts?.maxTokens || 800,
      temperature: opts?.temperature ?? 0.3,
    };
    if (opts?.jsonMode) body.response_format = { type: "json_object" };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${llmApiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) { console.error("LLM error:", res.status); return null; }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) { console.error("LLM call failed:", e); return null; }
}

async function embed(text: string): Promise<number[] | null> {
  const { llmApiKey, embeddingModel } = getConfig();
  if (!llmApiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${llmApiKey}` },
      body: JSON.stringify({ input: text.slice(0, 8000), model: embeddingModel }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch { return null; }
}

// ─── Tools ───
async function searchKnowledge(sb: ReturnType<typeof getSupabase>, query: string): Promise<KnowledgeResult> {
  const embedding = await embed(query);
  if (embedding) {
    const { data, error } = await sb.rpc("match_document_chunks", {
      query_embedding: embedding,
      match_threshold: 0.25,
      match_count: 6,
    });
    if (!error && data && (data as Record<string, unknown>[]).length > 0) {
      const rows = data as Record<string, unknown>[];
      const chunks: ChunkResult[] = rows.map((r) => ({
        content: r.content as string,
        section_label: r.section_label as string,
        document_title: r.document_title as string,
        similarity: r.similarity as number,
      }));
      const seen = new Set<string>();
      const sources: SourceCitation[] = chunks
        .filter((c) => { if (seen.has(c.document_title)) return false; seen.add(c.document_title); return true; })
        .map((c, i) => ({
          id: `s${i + 1}`, title: c.document_title, type: "Document",
          description: `Section: ${c.section_label}${c.similarity ? ` (${Math.round(c.similarity * 100)}% relevance)` : ""}`,
          sectionContent: c.content.slice(0, 800),
        }));
      return { chunks, sources, usedVectorSearch: true };
    }
  }

  // Keyword fallback
  const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const { data: allChunks } = await sb
    .from("document_chunks")
    .select("content, section_label, documents!inner(title, type)")
    .limit(50);

  if (!allChunks) return { chunks: [], sources: [], usedVectorSearch: false };

  const scored = (allChunks as Record<string, unknown>[])
    .map((chunk) => {
      const content = (chunk.content as string).toLowerCase();
      const section = (chunk.section_label as string).toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (content.includes(kw)) score += 2;
        if (section.includes(kw)) score += 3;
      }
      return { chunk, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const chunks: ChunkResult[] = scored.map((s) => ({
    content: s.chunk.content as string,
    section_label: s.chunk.section_label as string,
    document_title: (s.chunk.documents as Record<string, string>).title,
  }));

  const seen = new Set<string>();
  const sources: SourceCitation[] = chunks
    .filter((c) => { if (seen.has(c.document_title)) return false; seen.add(c.document_title); return true; })
    .map((c, i) => ({
      id: `s${i + 1}`, title: c.document_title, type: "Document",
      description: `Section: ${c.section_label}`,
      sectionContent: c.content.slice(0, 800),
    }));

  return { chunks, sources, usedVectorSearch: false };
}

async function getOnboardingTasks(sb: ReturnType<typeof getSupabase>, userId: string) {
  const { data } = await sb
    .from("onboarding_tasks")
    .select("id, title, description, status, category, icon, duration, link")
    .eq("user_id", userId)
    .order("task_order", { ascending: true });
  return (data || []) as Record<string, unknown>[];
}

async function getUserProfile(sb: ReturnType<typeof getSupabase>, userId: string) {
  const { data } = await sb.from("users").select("*").eq("id", userId).maybeSingle();
  return data as Record<string, unknown> | null;
}

async function findContact(sb: ReturnType<typeof getSupabase>, issue: string) {
  const { data } = await sb.from("contacts").select("*");
  if (!data) return null;
  const keywords = issue.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const scored = (data as Record<string, unknown>[])
    .map((c) => {
      const handles = (c.handles_issue as string).toLowerCase();
      let score = 0;
      for (const kw of keywords) { if (handles.includes(kw)) score += 3; }
      return { contact: c, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.length > 0 ? scored[0].contact : null;
}

// Returns existing access requests for the user, optionally filtered by resource keyword
async function getRequestStatus(
  sb: ReturnType<typeof getSupabase>, userId: string, resource?: string
): Promise<AccessRequestRecord[]> {
  let q = sb
    .from("access_requests")
    .select("request_id, resource, approver, approver_role, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (resource) {
    q = q.ilike("resource", `%${resource}%`);
  }

  const { data } = await q;
  if (!data) return [];

  return (data as Record<string, unknown>[]).map((r) => ({
    requestId: r.request_id as string,
    approver: r.approver as string,
    approverRole: r.approver_role as string,
    status: r.status as string,
    resource: r.resource as string,
    createdAt: r.created_at as string | undefined,
  }));
}

// Returns existing pending request for resource if one exists; creates new one otherwise
async function createAccessRequest(
  sb: ReturnType<typeof getSupabase>, resource: string, userId: string
): Promise<{ requestId: string; approver: string; approverRole: string; status: string; isDuplicate?: boolean } | null> {
  // Duplicate guard: check for an existing pending request for this resource
  const { data: existing } = await sb
    .from("access_requests")
    .select("request_id, approver, approver_role, status")
    .eq("user_id", userId)
    .ilike("resource", `%${resource}%`)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      requestId: (existing as Record<string, unknown>).request_id as string,
      approver: (existing as Record<string, unknown>).approver as string,
      approverRole: (existing as Record<string, unknown>).approver_role as string,
      status: (existing as Record<string, unknown>).status as string,
      isDuplicate: true,
    };
  }

  const approver = await findContact(sb, "github access approval team lead");
  const reqId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
  const approverName = approver ? (approver.name as string) : "Sarah Chen";
  const approverRole = approver ? (approver.role as string) : "ML Team Lead";
  const { error } = await sb.from("access_requests").insert({
    request_id: reqId, user_id: userId, resource,
    approver: approverName, approver_role: approverRole, status: "pending",
  });
  if (error) { console.error("Access request error:", error); return null; }
  return { requestId: reqId, approver: approverName, approverRole, status: "pending", isDuplicate: false };
}

async function updateTaskStatus(
  sb: ReturnType<typeof getSupabase>, taskTitle: string, userId: string, status: string
): Promise<boolean> {
  const { error } = await sb
    .from("onboarding_tasks")
    .update({ status })
    .eq("user_id", userId)
    .ilike("title", `%${taskTitle}%`);
  return !error;
}

// ─── Orchestration ───
const ORCHESTRATOR_PROMPT = `You are an AI orchestrator for OnboardAI at NovaTech. Analyze the user query and return JSON specifying which tools to use. Return only valid JSON.

Available tools:
- searchKnowledge: Search org documents (policies, guides). Use for ANY question about company info.
- getOnboardingTasks: Get user's task list. Use when user asks about progress or what to do next.
- getUserProfile: Get user profile. Use for personalized responses.
- findContact: Find a contact. Use when user asks who to talk to.
- getRequestStatus: Look up EXISTING access requests. Use when the user asks about REQUEST STATUS, whether a request was APPROVED, whether access was GRANTED, or any question about an existing request. NEVER create a new request for these queries.
- createAccessRequest: Submit a NEW access request. ONLY use when the user EXPLICITLY says "request access for me", "submit a request", "create an access request", or "I need you to request access". NEVER use for status/approval questions.
- updateTaskStatus: Update a task. Use only when explicitly confirming task completion.

CRITICAL RULES — read carefully:
- "What is my GitHub access request status?" → getRequestStatus (NOT createAccessRequest)
- "Is my request approved?" → getRequestStatus (NOT createAccessRequest)
- "Do I have GitHub access?" → getRequestStatus (NOT createAccessRequest)
- "Request GitHub access for me" → createAccessRequest
- "I need GitHub access" alone → getRequestStatus first; only use createAccessRequest if user says "request" or "submit"
- NEVER call createAccessRequest for any query containing "status", "approved", "pending", "granted", "my request", "check my"

Return this exact JSON:
{"intent":"brief description","tools":["tool1"],"searchQuery":"if searchKnowledge used","contactQuery":"if findContact used","accessResource":"resource keyword if createAccessRequest or getRequestStatus used","taskTitle":"if updateTaskStatus used","taskStatus":"if updateTaskStatus used"}

Examples:
"What security training do I need?" -> {"intent":"knowledge question","tools":["searchKnowledge"],"searchQuery":"security training requirements"}
"What do I still need to complete?" -> {"intent":"onboarding status","tools":["getUserProfile","getOnboardingTasks"]}
"What is my GitHub access request status?" -> {"intent":"request status check","tools":["getRequestStatus"],"accessResource":"GitHub"}
"Is my request approved?" -> {"intent":"request status check","tools":["getRequestStatus"],"accessResource":"GitHub"}
"Do I have GitHub access?" -> {"intent":"access status check","tools":["getRequestStatus"],"accessResource":"GitHub"}
"Request GitHub access for me" -> {"intent":"create access request","tools":["searchKnowledge","getUserProfile","findContact","createAccessRequest"],"searchQuery":"github access policy approval","contactQuery":"github team lead approval","accessResource":"GitHub"}
"I just joined the ML team" -> {"intent":"multi-step onboarding","tools":["getUserProfile","getOnboardingTasks","searchKnowledge","findContact"],"searchQuery":"ML team onboarding guide getting started","contactQuery":"team lead ml onboarding"}
"Who handles laptop issues?" -> {"intent":"contact lookup","tools":["findContact"],"contactQuery":"laptop hardware IT support"}`;

async function orchestrate(query: string): Promise<Plan> {
  const response = await llmCall(
    [{ role: "system", content: ORCHESTRATOR_PROMPT }, { role: "user", content: query }],
    { maxTokens: 300, temperature: 0, jsonMode: true }
  );

  if (response) {
    try { return JSON.parse(response) as Plan; } catch { /* fall through */ }
  }

  // Keyword fallback — order matters: status checks must be tested BEFORE create checks
  const q = query.toLowerCase();

  // Status/check queries (must come first to prevent misrouting to createAccessRequest)
  const isStatusQuery =
    q.includes("status") ||
    q.includes("approved") ||
    q.includes("approval") ||
    q.includes("granted") ||
    (q.includes("my") && (q.includes("request") || q.includes("access")) && !q.includes("request access for") && !q.includes("request github") && !q.includes("get me access") && !q.includes("give me access"));

  if (isStatusQuery && (q.includes("github") || q.includes("access") || q.includes("request"))) {
    return { intent: "request_status_check", tools: ["getRequestStatus"], accessResource: "GitHub" };
  }

  // Explicit create-request queries (only when user clearly asks to submit/create)
  const isExplicitCreate =
    (q.includes("request access") || q.includes("request github") || q.includes("get me access") || q.includes("give me access") || q.includes("submit") || q.includes("create") || (q.includes("need") && q.includes("access") && !q.includes("status"))) &&
    !isStatusQuery;

  if (isExplicitCreate) {
    return { intent: "access_request", tools: ["searchKnowledge", "getUserProfile", "findContact", "createAccessRequest"], searchQuery: "github access policy requirements", contactQuery: "github team lead approval", accessResource: "GitHub" };
  }

  if (q.includes("just joined") || q.includes("get everything") || q.includes("get started") || q.includes("new employee")) {
    return { intent: "multi_step_onboarding", tools: ["getUserProfile", "getOnboardingTasks", "searchKnowledge", "findContact"], searchQuery: "ML team onboarding guide getting started", contactQuery: "team lead onboarding" };
  }
  if ((q.includes("left") || q.includes("remaining") || q.includes("still need") || q.includes("progress") || q.includes("todo")) && !q.includes("document")) {
    return { intent: "onboarding_status", tools: ["getUserProfile", "getOnboardingTasks"] };
  }
  if (q.includes("who") || q.includes("laptop") || q.includes("hardware") || q.includes("vpn") || q.includes("password")) {
    return { intent: "contact_lookup", tools: ["findContact", "searchKnowledge"], contactQuery: query, searchQuery: query };
  }
  return { intent: "knowledge_question", tools: ["searchKnowledge"], searchQuery: query };
}

// ─── Response generation ───
async function generateResponse(
  query: string, plan: Plan, toolData: Record<string, unknown>, mode: "ai" | "demo"
): Promise<{ greeting: string; summary: string }> {
  if (mode === "demo") return buildDemoResponse(plan, toolData);

  const ctxParts: string[] = [];
  const kr = toolData.searchKnowledge as KnowledgeResult | undefined;
  if (kr && kr.chunks.length > 0) {
    ctxParts.push("KNOWLEDGE BASE:\n" + kr.chunks.slice(0, 4).map((c) => `[${c.document_title} - ${c.section_label}]:\n${c.content}`).join("\n\n"));
  }
  const profile = toolData.getUserProfile as Record<string, unknown> | undefined;
  if (profile) ctxParts.push(`USER: ${profile.name} (${profile.role}, ${profile.department}), Progress: ${profile.progress}%`);
  const tasks = toolData.getOnboardingTasks as Record<string, unknown>[] | undefined;
  if (tasks && tasks.length > 0) {
    const done = tasks.filter((t) => t.status === "completed").map((t) => t.title).join(", ");
    const pending = tasks.filter((t) => t.status !== "completed").map((t) => `${t.title} (${t.duration})`).join(", ");
    ctxParts.push(`ONBOARDING TASKS:\nCompleted: ${done || "none"}\nPending: ${pending || "none"}`);
  }
  const contact = toolData.findContact as Record<string, unknown> | undefined;
  if (contact) ctxParts.push(`CONTACT: ${contact.name} (${contact.role}) - ${contact.email}, ${contact.phone}`);

  const reqStatuses = toolData.getRequestStatus as AccessRequestRecord[] | undefined;
  if (reqStatuses && reqStatuses.length > 0) {
    const lines = reqStatuses.map((r) => `Request ${r.requestId}: ${r.resource} — Status: ${r.status}, Approver: ${r.approver} (${r.approverRole})`).join("\n");
    ctxParts.push(`EXISTING ACCESS REQUESTS:\n${lines}`);
  }

  const req = toolData.createAccessRequest as { requestId: string; approver: string; approverRole: string; isDuplicate?: boolean } | null | undefined;
  if (req) {
    ctxParts.push(req.isDuplicate
      ? `EXISTING PENDING REQUEST: ID ${req.requestId}, Approver: ${req.approver} (${req.approverRole}), Status: Pending (already submitted — no new request created)`
      : `NEW ACCESS REQUEST CREATED: ID ${req.requestId}, Approver: ${req.approver} (${req.approverRole}), Status: Pending`);
  }

  const hasKnowledge = kr && kr.chunks.length > 0;
  const isKnowledgeQuery = plan.tools.includes("searchKnowledge");
  const knowledgeInstructions = hasKnowledge || !isKnowledgeQuery
    ? "Answer based only on the provided context. Be concise and helpful."
    : "The knowledge base does not contain enough information. Clearly state this, then offer to connect the user with an appropriate contact.";

  const systemPrompt = `You are OnboardAI, the employee onboarding assistant for NovaTech. Be concise and friendly.\n${knowledgeInstructions}\nNever fabricate policies, contacts, or procedures not in the context.\n\nContext:\n${ctxParts.join("\n\n")}`;

  const response = await llmCall(
    [{ role: "system", content: systemPrompt }, { role: "user", content: query }],
    { maxTokens: 600, temperature: 0.3 }
  );

  if (!response) return buildDemoResponse(plan, toolData);
  return { greeting: "Here's what I found:", summary: response };
}

function buildDemoResponse(plan: Plan, toolData: Record<string, unknown>): { greeting: string; summary: string } {
  const parts: string[] = [];
  let greeting = "Here's what I found:";
  const profile = toolData.getUserProfile as Record<string, unknown> | undefined;
  if (profile) greeting = `Here's the information for you, ${(profile.name as string).split(" ")[0]}:`;

  // getRequestStatus result
  const reqStatuses = toolData.getRequestStatus as AccessRequestRecord[] | undefined;
  if (reqStatuses !== undefined) {
    if (reqStatuses.length > 0) {
      greeting = "Here's your access request status:";
      const lines = reqStatuses.map((r) => {
        const statusLabel = r.status === "pending" ? "⏳ Pending Approval" : r.status === "approved" ? "✓ Approved" : r.status === "rejected" ? "✗ Rejected" : r.status;
        return `Request ID: ${r.requestId}\nResource: ${r.resource}\nStatus: ${statusLabel}\nApprover: ${r.approver} (${r.approverRole})`;
      }).join("\n\n");
      parts.push(lines);
    } else {
      parts.push("You don't have any access requests on file yet. If you'd like to request GitHub access, just say \"Request GitHub access for me\" and I'll submit it.");
    }
  }

  const kr = toolData.searchKnowledge as KnowledgeResult | undefined;
  if (kr) {
    if (kr.chunks.length > 0) {
      parts.push(kr.chunks.slice(0, 3).map((c) => `[${c.document_title} - ${c.section_label}]:\n${c.content.slice(0, 500)}`).join("\n\n"));
    } else if (plan.tools.includes("searchKnowledge")) {
      parts.push("I searched the NovaTech knowledge base but could not find specific information about this topic.");
    }
  }

  const tasks = toolData.getOnboardingTasks as Record<string, unknown>[] | undefined;
  if (tasks && tasks.length > 0) {
    const completed = tasks.filter((t) => t.status === "completed");
    const pending = tasks.filter((t) => t.status !== "completed");
    const pct = Math.round((completed.length / tasks.length) * 100);
    parts.push(`You are ${pct}% through your onboarding.\n\nCompleted (${completed.length}):\n${completed.map((t) => `✓ ${t.title}`).join("\n")}\n\nRemaining (${pending.length}):\n${pending.map((t) => `○ ${t.title} (${t.duration})`).join("\n")}`);
  }

  const contact = toolData.findContact as Record<string, unknown> | undefined;
  if (contact) {
    parts.push(`Contact:\n${contact.name} - ${contact.role}\nEmail: ${contact.email}\nPhone: ${contact.phone}`);
  }

  const req = toolData.createAccessRequest as { requestId: string; approver: string; approverRole: string; status: string; isDuplicate?: boolean } | null | undefined;
  if (req !== undefined) {
    if (req) {
      if (req.isDuplicate) {
        greeting = "You already have a pending request:";
        parts.unshift(`You already have a pending access request — no duplicate was created.\n\nRequest ID: ${req.requestId}\nApprover: ${req.approver} (${req.approverRole})\nStatus: Pending Approval\n\nYou'll be notified when ${req.approver} approves it.`);
      } else {
        parts.push(`Access request created.\n\nRequest ID: ${req.requestId}\nApprover: ${req.approver} (${req.approverRole})\nStatus: Pending Approval\n\nYou will be notified once approved (typically within 24 hours).`);
      }
    } else {
      parts.push("There was an issue creating the access request. Please try again or contact your team lead directly.");
    }
  }

  return {
    greeting,
    summary: parts.join("\n\n") || "I was unable to process this request. Please try rephrasing or contact your team lead.",
  };
}

// ─── Main Handler ───
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { query, userId } = await req.json();
    const uid = userId || DEMO_USER_ID;
    const sb = getSupabase();
    const { llmApiKey } = getConfig();
    const mode: "ai" | "demo" = llmApiKey ? "ai" : "demo";

    const activity: AgentEvent[] = [];

    activity.push({
      icon: "Sparkles", title: "Understanding request",
      description: mode === "ai" ? "AI-powered intent classification" : "Analyzing request (demo mode - set LLM_API_KEY for full AI)",
      status: "completed", tool: "Orchestrator", detail: `Mode: ${mode}`, event_type: "INTENT_DETECTED",
    });
    const plan = await orchestrate(query);

    const toolData: Record<string, unknown> = {};
    let accessRequest: AgentResponse["accessRequest"];
    let taskUpdated = false;

    for (const tool of plan.tools) {
      if (tool === "searchKnowledge") {
        activity.push({
          icon: "Search", title: "Searching organizational knowledge",
          description: mode === "ai" ? "Semantic vector similarity search" : "Keyword search (demo mode)",
          status: "completed", tool: "KnowledgeSearch", detail: plan.searchQuery || query, event_type: "KNOWLEDGE_SEARCH",
        });
        toolData.searchKnowledge = await searchKnowledge(sb, plan.searchQuery || query);
      }
      if (tool === "getUserProfile") {
        activity.push({ icon: "UserCheck", title: "Retrieving user profile", description: "Loading your profile and role", status: "completed", tool: "UserProfile", detail: `User: ${uid}`, event_type: "TOOL_EXECUTED" });
        toolData.getUserProfile = await getUserProfile(sb, uid);
      }
      if (tool === "getOnboardingTasks") {
        activity.push({ icon: "ListChecks", title: "Checking onboarding progress", description: "Retrieving your task list from database", status: "completed", tool: "OnboardingTasks", detail: "Loading task states", event_type: "TOOL_EXECUTED" });
        toolData.getOnboardingTasks = await getOnboardingTasks(sb, uid);
        const tasks = toolData.getOnboardingTasks as Record<string, unknown>[];
        const done = tasks.filter((t) => t.status === "completed").length;
        activity[activity.length - 1].detail = `${done} completed, ${tasks.length - done} remaining`;
      }
      if (tool === "findContact") {
        activity.push({ icon: "Users", title: "Finding appropriate contact", description: "Searching team directory", status: "completed", tool: "DirectorySearch", detail: plan.contactQuery || query, event_type: "TOOL_EXECUTED" });
        toolData.findContact = await findContact(sb, plan.contactQuery || query);
        const c = toolData.findContact as Record<string, unknown> | null;
        if (c) activity[activity.length - 1].detail = `Found: ${c.name} (${c.role})`;
      }
      if (tool === "getRequestStatus") {
        activity.push({ icon: "FileSearch", title: "Checking existing access requests", description: "Looking up your access request history", status: "completed", tool: "RequestLookup", detail: `Resource: ${plan.accessResource || "all"}`, event_type: "TOOL_EXECUTED" });
        const statuses = await getRequestStatus(sb, uid, plan.accessResource);
        toolData.getRequestStatus = statuses;
        if (statuses.length > 0) {
          const latest = statuses[0];
          activity[activity.length - 1].detail = `Found ${statuses.length} request(s) — latest: ${latest.requestId} (${latest.status})`;
        } else {
          activity[activity.length - 1].detail = "No existing access requests found";
        }
      }
      if (tool === "createAccessRequest") {
        activity.push({ icon: "FileCheck2", title: "Processing access request", description: `Checking for existing ${plan.accessResource || "resource"} requests`, status: "completed", tool: "RequestCreator", detail: "Checking for duplicates before creating", event_type: "STATE_UPDATED" });
        const reqResult = await createAccessRequest(sb, plan.accessResource || "GitHub", uid);
        toolData.createAccessRequest = reqResult;
        accessRequest = reqResult || undefined;
        if (reqResult) {
          if (reqResult.isDuplicate) {
            activity[activity.length - 1].detail = `Existing request ${reqResult.requestId} found — no duplicate created`;
            activity[activity.length - 1].title = "Duplicate prevented";
            activity[activity.length - 1].description = `Request ${reqResult.requestId} already pending approval`;
          } else {
            await updateTaskStatus(sb, "GitHub", uid, "in-progress");
            taskUpdated = true;
            activity[activity.length - 1].detail = `Request ${reqResult.requestId} submitted to ${reqResult.approver}`;
            activity[activity.length - 1].title = "Access request created";
            activity[activity.length - 1].description = `${plan.accessResource || "GitHub"} access request submitted`;
            await sb.from("agent_activity").insert({ user_id: uid, icon: "FileCheck2", title: `Created access request ${reqResult.requestId}`, description: `${plan.accessResource || "GitHub"} access pending approval from ${reqResult.approver}`, timestamp: "Just now", status: "completed", tool: "RequestCreator", detail: `Request ID: ${reqResult.requestId}`, event_type: "STATE_UPDATED" });
          }
        }
      }
      if (tool === "updateTaskStatus" && plan.taskTitle && plan.taskStatus) {
        activity.push({ icon: "CheckCircle2", title: "Updating task status", description: `Setting ${plan.taskTitle} to ${plan.taskStatus}`, status: "completed", tool: "TaskUpdater", detail: `Task: ${plan.taskTitle}`, event_type: "STATE_UPDATED" });
        taskUpdated = await updateTaskStatus(sb, plan.taskTitle, uid, plan.taskStatus);
      }
    }

    // Human escalation check
    const kr = toolData.searchKnowledge as KnowledgeResult | undefined;
    const isKnowledgeOnlyQuery = plan.tools.includes("searchKnowledge") &&
      !plan.tools.includes("getOnboardingTasks") && !plan.tools.includes("createAccessRequest") && !plan.tools.includes("getRequestStatus");
    const noKnowledgeFound = isKnowledgeOnlyQuery && (!kr || kr.chunks.length === 0);

    if (noKnowledgeFound) {
      activity.push({ icon: "AlertCircle", title: "Knowledge unavailable", description: "Offering human escalation", status: "completed", tool: "EscalationHandler", detail: "No reliable information found in knowledge base", event_type: "ESCALATION" });
    }

    const { greeting: rawGreeting, summary: rawSummary } = await generateResponse(query, plan, toolData, mode);
    let finalGreeting = rawGreeting;
    let finalSummary = rawSummary;

    if (noKnowledgeFound) {
      const escalationContact = await findContact(sb, "engineering manager admin escalation");
      finalGreeting = "I couldn't find that in the NovaTech knowledge base.";
      finalSummary = `I searched through all available NovaTech organizational documents but could not find reliable information about this specific topic.\n\nFor an accurate answer, please contact:`;
      if (escalationContact) {
        finalSummary += `\n\n${escalationContact.name} (${(escalationContact as Record<string, unknown>).role})\nEmail: ${(escalationContact as Record<string, unknown>).email}\nPhone: ${(escalationContact as Record<string, unknown>).phone}`;
      } else {
        finalSummary += "\n\n- Your team lead or direct manager\n- HR team at hr@novatech.ai for policy questions\n- IT Support at it@novatech.ai for technical questions";
      }
    }

    // Build structured response
    const tasks = (toolData.getOnboardingTasks as Record<string, unknown>[] | undefined) || [];
    const checklist = tasks.map((t, i) => ({ id: `c${i + 1}`, label: t.title as string, done: t.status === "completed" }));

    let workflowTitle = plan.intent.replace(/_/g, " ");
    let workflowSteps: { id: string; label: string; state: "pending" | "active" | "completed" }[] = [];
    let workflowRequestId: string | undefined;
    let workflowStatus: string | undefined;

    const reqStatuses = toolData.getRequestStatus as AccessRequestRecord[] | undefined;
    if (reqStatuses && reqStatuses.length > 0) {
      // Status lookup workflow
      const latest = reqStatuses[0];
      workflowTitle = "Access Request Status";
      workflowSteps = [
        { id: "w1", label: "Looked up existing requests", state: "completed" },
        { id: "w2", label: `Found: ${latest.requestId}`, state: "completed" },
        { id: "w3", label: `Approver: ${latest.approver}`, state: "completed" },
        { id: "w4", label: `Status: ${latest.status}`, state: latest.status === "approved" ? "completed" : "active" },
      ];
      workflowRequestId = latest.requestId;
      workflowStatus = latest.status === "pending" ? "Pending Approval" : latest.status === "approved" ? "Approved" : latest.status;
    } else if (accessRequest) {
      if (accessRequest.isDuplicate) {
        workflowTitle = "Existing Access Request";
        workflowSteps = [
          { id: "w1", label: "Checked for existing requests", state: "completed" },
          { id: "w2", label: `Found: ${accessRequest.requestId}`, state: "completed" },
          { id: "w3", label: "No duplicate created", state: "completed" },
          { id: "w4", label: `Approver: ${accessRequest.approver}`, state: "active" },
        ];
      } else {
        workflowTitle = "GitHub Access Request Workflow";
        workflowSteps = [
          { id: "w1", label: "Policy verified", state: "completed" },
          { id: "w2", label: "Requirements checked", state: "completed" },
          { id: "w3", label: `Approver: ${accessRequest.approver}`, state: "completed" },
          { id: "w4", label: "Request created", state: "completed" },
        ];
      }
      workflowRequestId = accessRequest.requestId;
      workflowStatus = `Pending ${accessRequest.approverRole} Approval`;
    } else if (tasks.length > 0) {
      workflowTitle = "Your Onboarding Journey";
      workflowSteps = tasks.slice(0, 4).map((t, i) => ({
        id: `w${i + 1}`, label: t.title as string,
        state: t.status === "completed" ? "completed" as const : t.status === "in-progress" ? "active" as const : "pending" as const,
      }));
    } else if (kr && kr.sources.length > 0) {
      workflowTitle = "Knowledge Sources";
      workflowSteps = kr.sources.slice(0, 3).map((s, i) => ({ id: `w${i + 1}`, label: s.title, state: "completed" as const }));
    } else if (noKnowledgeFound) {
      workflowTitle = "Information Unavailable";
      workflowSteps = [
        { id: "w1", label: "Knowledge base searched", state: "completed" },
        { id: "w2", label: "No reliable information found", state: "completed" },
        { id: "w3", label: "Human escalation offered", state: "active" },
      ];
    }

    for (const event of activity) {
      await sb.from("agent_activity").insert({ user_id: uid, ...event, timestamp: "Just now" })
        .then(({ error }) => { if (error) console.error("Activity log:", error.message); });
    }

    const responseBody: AgentResponse = {
      greeting: finalGreeting, summary: finalSummary, checklist,
      workflow: { title: workflowTitle, steps: workflowSteps, requestId: workflowRequestId, status: workflowStatus },
      sources: kr?.sources || [], activity,
      taskUpdate: taskUpdated ? { taskId: plan.taskTitle || "task", newStatus: plan.taskStatus || "in-progress" } : undefined,
      accessRequest, mode,
    };

    return new Response(JSON.stringify(responseBody), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Agent error:", err);
    return new Response(JSON.stringify({
      error: err.message, greeting: "Something went wrong",
      summary: "I encountered an error processing your request. Please try again.",
      checklist: [], workflow: { title: "Error", steps: [] }, sources: [], activity: [], mode: "demo",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
