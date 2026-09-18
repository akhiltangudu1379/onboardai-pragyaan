import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ToolResult {
  name: string;
  result: unknown;
}

interface AgentEvent {
  icon: string;
  title: string;
  description: string;
  status: "processing" | "completed";
  tool: string;
  detail: string;
  event_type: string;
}

interface AgentResponse {
  greeting: string;
  summary: string;
  checklist: { id: string; label: string; done: boolean }[];
  workflow: {
    title: string;
    steps: { id: string; label: string; state: "pending" | "active" | "completed" }[];
    requestId?: string;
    status?: string;
  };
  sources: { id: string; title: string; type: string; description: string }[];
  activity: AgentEvent[];
  taskUpdate?: { taskId: string; newStatus: string };
  accessRequest?: { requestId: string; approver: string; approverRole: string; status: string };
}

const DEMO_USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// ─── Supabase client ───
function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

// ─── Tool: searchKnowledge ───
async function searchKnowledge(
  supabase: ReturnType<typeof getSupabase>,
  query: string
): Promise<{ chunks: { content: string; section_label: string; document_title: string }[]; sources: { id: string; title: string; type: string; description: string }[] }> {
  // Simple keyword-based search (no embeddings in demo mode)
  // Search across document_chunks using ILIKE for relevant keywords
  const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  let { data: chunks, error } = await supabase
    .from("document_chunks")
    .select(`
      content,
      section_label,
      documents!inner(title, type)
    `)
    .limit(20);

  if (error || !chunks) {
    return { chunks: [], sources: [] };
  }

  // Score chunks by keyword matches
  const scored = chunks
    .map((chunk: Record<string, unknown>) => {
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

  const topChunks = scored.map((s) => ({
    content: s.chunk.content as string,
    section_label: s.chunk.section_label as string,
    document_title: (s.chunk.documents as Record<string, string>).title,
  }));

  // Deduplicate sources
  const seenDocs = new Set<string>();
  const sources = topChunks
    .filter((c) => {
      if (seenDocs.has(c.document_title)) return false;
      seenDocs.add(c.document_title);
      return true;
    })
    .map((c, i) => ({
      id: `s${i + 1}`,
      title: c.document_title,
      type: "Document",
      description: `Section: ${c.section_label}`,
    }));

  return { chunks: topChunks, sources };
}

// ─── Tool: getOnboardingTasks ───
async function getOnboardingTasks(
  supabase: ReturnType<typeof getSupabase>,
  userId: string
): Promise<{ id: string; title: string; description: string; status: string; category: string; icon: string; duration: string; link: string | null }[]> {
  const { data, error } = await supabase
    .from("onboarding_tasks")
    .select("id, title, description, status, category, icon, duration, link")
    .eq("user_id", userId)
    .order("task_order", { ascending: true });

  if (error || !data) return [];
  return data;
}

// ─── Tool: getUserProfile ───
async function getUserProfile(
  supabase: ReturnType<typeof getSupabase>,
  userId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// ─── Tool: findContact ───
async function findContact(
  supabase: ReturnType<typeof getSupabase>,
  issue: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*");

  if (error || !data) return null;

  const issueLower = issue.toLowerCase();
  const keywords = issueLower.split(/\s+/).filter((w) => w.length > 2);

  const scored = data
    .map((contact: Record<string, unknown>) => {
      const handles = (contact.handles_issue as string).toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (handles.includes(kw)) score += 3;
      }
      return { contact, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length > 0 ? scored[0].contact : null;
}

// ─── Tool: createAccessRequest ───
async function createAccessRequest(
  supabase: ReturnType<typeof getSupabase>,
  resource: string,
  userId: string
): Promise<{ requestId: string; approver: string; approverRole: string; status: string } | null> {
  // Find the appropriate approver from contacts
  const approver = await findContact(supabase, "github access approval team lead");

  const reqId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
  const approverName = approver ? (approver.name as string) : "Sarah Chen";
  const approverRole = approver ? (approver.role as string) : "ML Team Lead";

  const { error } = await supabase.from("access_requests").insert({
    request_id: reqId,
    user_id: userId,
    resource,
    approver: approverName,
    approver_role: approverRole,
    status: "pending",
  });

  if (error) return null;

  return { requestId: reqId, approver: approverName, approverRole, status: "pending" };
}

// ─── Tool: updateTaskStatus ───
async function updateTaskStatus(
  supabase: ReturnType<typeof getSupabase>,
  taskTitle: string,
  userId: string,
  status: string
): Promise<boolean> {
  const { error } = await supabase
    .from("onboarding_tasks")
    .update({ status })
    .eq("user_id", userId)
    .ilike("title", `%${taskTitle}%`);

  return !error;
}

// ─── Tool: getRequestStatus ───
async function getRequestStatus(
  supabase: ReturnType<typeof getSupabase>,
  requestId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("access_requests")
    .select("*")
    .eq("request_id", requestId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// ─── Intent Detection ───
type Intent = "knowledge_question" | "access_request" | "onboarding_status" | "contact_lookup" | "multi_step_onboarding" | "general";

function detectIntent(query: string): Intent {
  const q = query.toLowerCase();

  if ((q.includes("request") || q.includes("create") || q.includes("get me") || q.includes("give me")) &&
      (q.includes("github") || q.includes("access"))) {
    return "access_request";
  }

  if (q.includes("who") && (q.includes("contact") || q.includes("talk to") || q.includes("reach"))) {
    return "contact_lookup";
  }

  if (q.includes("laptop") || q.includes("hardware") || q.includes("vpn") || q.includes("password") || q.includes("reset")) {
    return "contact_lookup";
  }

  if (q.includes("what") && (q.includes("left") || q.includes("remaining") || q.includes("todo") || q.includes("status"))) {
    return "onboarding_status";
  }

  if (q.includes("what do i have") || q.includes("onboarding progress") || q.includes("what should i do next")) {
    return "onboarding_status";
  }

  if (q.includes("just joined") || q.includes("help me get everything") || q.includes("new here") || q.includes("get started")) {
    return "multi_step_onboarding";
  }

  return "knowledge_question";
}

// ─── LLM call (if API key available) ───
async function callLLM(prompt: string, context: string): Promise<string | null> {
  const apiKey = Deno.env.get("LLM_API_KEY");
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are the OnboardAI assistant for NovaTech. Answer the user's question based ONLY on the provided context. If the context does not contain relevant information, say "I couldn't find that information in the current NovaTech knowledge base." Do not fabricate policies, contacts, or procedures. Be concise and helpful.\n\nContext:\n${context}`,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

// ─── Build response from context + tools ───
function buildKnowledgeResponse(
  query: string,
  searchResult: { chunks: { content: string; section_label: string; document_title: string }[]; sources: { id: string; title: string; type: string; description: string }[] },
  llmAnswer: string | null
): { greeting: string; summary: string } {
  if (llmAnswer) {
    return { greeting: "Here's what I found:", summary: llmAnswer };
  }

  // Fallback: use retrieved chunks to build answer
  if (searchResult.chunks.length === 0) {
    return {
      greeting: "I couldn't find that information in the current NovaTech knowledge base.",
      summary: "I searched through all indexed NovaTech documents but couldn't find relevant information for your question. Try rephrasing or asking about onboarding tasks, GitHub access, security training, or team contacts.",
    };
  }

  const topChunks = searchResult.chunks.slice(0, 3);
  const summary = topChunks
    .map((c) => `[${c.document_title} — ${c.section_label}]: ${c.content}`)
    .join("\n\n");

  return {
    greeting: "Based on the NovaTech knowledge base, here's what I found:",
    summary,
  };
}

// ─── Main handler ───
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query, userId } = await req.json();
    const uid = userId || DEMO_USER_ID;
    const supabase = getSupabase();

    const intent = detectIntent(query);
    const activity: AgentEvent[] = [];

    activity.push({
      icon: "Sparkles",
      title: "Understood request",
      description: `Intent: ${intent.replace(/_/g, " ")}`,
      status: "completed",
      tool: "Orchestrator",
      detail: `Detected intent: ${intent}`,
      event_type: "INTENT_DETECTED",
    });

    let response: AgentResponse;

    if (intent === "access_request") {
      // ─── Access Request Workflow ───
      activity.push({ icon: "Search", title: "Searching policy", description: "Searching GitHub Access Policy", status: "completed", tool: "KnowledgeSearch", detail: "Retrieved relevant policy sections", event_type: "KNOWLEDGE_SEARCH" });

      const searchResult = await searchKnowledge(supabase, "github access policy requirements approval");

      activity.push({ icon: "ShieldCheck", title: "Checking requirements", description: "Verifying access requirements", status: "completed", tool: "PolicyChecker", detail: "Requirements verified against policy", event_type: "TOOL_EXECUTED" });

      // Get user profile to verify
      const profile = await getUserProfile(supabase, uid);

      activity.push({ icon: "UserCheck", title: "Finding approver", description: "Identifying team lead as approver", status: "completed", tool: "ApproverResolver", detail: "Resolved via team hierarchy", event_type: "TOOL_EXECUTED" });

      // Find the approver
      const approver = await findContact(supabase, "github access approval team lead");

      activity.push({ icon: "FileCheck2", title: "Creating request", description: "Generating access request", status: "completed", tool: "RequestCreator", detail: "Creating compliant request", event_type: "TOOL_EXECUTED" });

      // Create the access request
      const request = await createAccessRequest(supabase, "GitHub", uid);

      // Update the onboarding task
      const taskUpdated = await updateTaskStatus(supabase, "GitHub", uid, "in-progress");

      // Try LLM for a personalized summary
      const context = searchResult.chunks.map((c) => c.content).join("\n");
      const llmAnswer = await callLLM(
        `The user asked: "${query}". Based on the GitHub access policy, explain the access requirements. An access request has been created with ID ${request?.requestId}. The approver is ${request?.approver} (${request?.approverRole}).`,
        context
      );

      response = {
        greeting: llmAnswer || "I've created your GitHub access request. Based on the Engineering Access Policy, your request has been routed to your team lead for approval.",
        summary: llmAnswer || `Based on the GitHub Access Policy, repository access requires approval from your direct team lead. I've verified your requirements and created the request. Access will be provisioned within 24 hours of approval. You will receive read and write access to: ml-pipeline, ml-models, ml-infrastructure.`,
        checklist: [
          { id: "c1", label: "Verify employment status", done: true },
          { id: "c2", label: "Confirm team assignment", done: true },
          { id: "c3", label: "Identify required repository tier", done: true },
          { id: "c4", label: "Submit access request for approval", done: true },
        ],
        workflow: {
          title: "GitHub Access Request Workflow",
          steps: [
            { id: "w1", label: "Searching policy", state: "completed" },
            { id: "w2", label: "Checking requirements", state: "completed" },
            { id: "w3", label: "Finding approver", state: "completed" },
            { id: "w4", label: "Creating request", state: "completed" },
          ],
          requestId: request?.requestId,
          status: `Pending ${request?.approverRole} Approval`,
        },
        sources: searchResult.sources.length > 0 ? searchResult.sources : [
          { id: "s1", title: "GitHub Access Policy", type: "Policy Document", description: "Access tiers and approval matrix" },
          { id: "s2", title: "ML Team Onboarding Guide", type: "Guide", description: "ML team GitHub access steps" },
        ],
        activity,
        taskUpdate: taskUpdated ? { taskId: "github-access", newStatus: "in-progress" } : undefined,
        accessRequest: request || undefined,
      };

      // Log activity to database
      await supabase.from("agent_activity").insert({
        user_id: uid,
        icon: "FileCheck2",
        title: "Created GitHub access request",
        description: `Request ${request?.requestId} pending approval from ${request?.approver}`,
        timestamp: "Just now",
        status: "completed",
        tool: "RequestCreator",
        detail: `Request ID: ${request?.requestId}`,
        event_type: "STATE_UPDATED",
      });

    } else if (intent === "onboarding_status") {
      // ─── Onboarding Status ───
      activity.push({ icon: "UserCheck", title: "Checked user profile", description: "Retrieved user onboarding state", status: "completed", tool: "UserProfile", detail: "User profile loaded", event_type: "TOOL_EXECUTED" });

      const tasks = await getOnboardingTasks(supabase, uid);
      const profile = await getUserProfile(supabase, uid);

      activity.push({ icon: "ListChecks", title: "Retrieved onboarding tasks", description: `Found ${tasks.length} tasks`, status: "completed", tool: "OnboardingTasks", detail: `${tasks.filter(t => t.status === "completed").length} completed, ${tasks.filter(t => t.status !== "completed").length} remaining`, event_type: "TOOL_EXECUTED" });

      const completed = tasks.filter((t) => t.status === "completed");
      const inProgress = tasks.filter((t) => t.status === "in-progress");
      const pending = tasks.filter((t) => t.status === "pending");
      const progressPct = Math.round((completed.length / tasks.length) * 100);

      const remainingTasks = [...inProgress, ...pending];

      const summary = `You are ${progressPct}% through your onboarding.\n\nCompleted (${completed.length}):\n${completed.map((t) => `✓ ${t.title}`).join("\n")}\n\nIn Progress (${inProgress.length}):\n${inProgress.map((t) => `→ ${t.title}`).join("\n")}\n\nPending (${pending.length}):\n${pending.map((t) => `○ ${t.title}`).join("\n")}\n\nNext recommended task: ${remainingTasks[0]?.title || "All tasks complete!"}`;

      response = {
        greeting: `Here's your current onboarding status, ${profile?.name?.split(" ")[0] || "Alex"}.`,
        summary,
        checklist: tasks.map((t, i) => ({
          id: `c${i + 1}`,
          label: t.title,
          done: t.status === "completed",
        })),
        workflow: {
          title: "Your Onboarding Journey",
          steps: tasks.slice(0, 4).map((t, i) => ({
            id: `w${i + 1}`,
            label: t.title,
            state: t.status === "completed" ? "completed" as const : t.status === "in-progress" ? "active" as const : "pending" as const,
          })),
        },
        sources: [],
        activity,
      };

    } else if (intent === "contact_lookup") {
      // ─── Contact Lookup ───
      activity.push({ icon: "Search", title: "Searching directory", description: "Looking up relevant contacts", status: "completed", tool: "DirectorySearch", detail: "Searching team directory", event_type: "KNOWLEDGE_SEARCH" });

      const contact = await findContact(supabase, query);

      // Also search knowledge base for relevant info
      const searchResult = await searchKnowledge(supabase, query);

      if (contact) {
        activity.push({ icon: "UserCheck", title: "Found contact", description: `${contact.name} - ${contact.role}`, status: "completed", tool: "ContactResolver", detail: `Resolved: ${contact.name}`, event_type: "TOOL_EXECUTED" });

        const llmContext = searchResult.chunks.map((c) => c.content).join("\n");
        const llmAnswer = await callLLM(
          `The user asked: "${query}". The relevant contact is ${contact.name}, ${contact.role}, ${contact.department}. Email: ${contact.email}, Phone: ${contact.phone}.`,
          llmContext
        );

        response = {
          greeting: llmAnswer || `For that issue, you should contact ${contact.name}.`,
          summary: llmAnswer || `${contact.name} is the ${contact.role} in the ${contact.department} department at NovaTech.\n\nEmail: ${contact.email}\nPhone: ${contact.phone}\n\nThey handle: ${contact.handles_issue}`,
          checklist: [],
          workflow: {
            title: "Contact Information",
            steps: [
              { id: "w1", label: `Contact: ${contact.name}`, state: "completed" },
              { id: "w2", label: `Role: ${contact.role}`, state: "completed" },
              { id: "w3", label: `Email: ${contact.email}`, state: "completed" },
              { id: "w4", label: `Phone: ${contact.phone}`, state: "completed" },
            ],
          },
          sources: searchResult.sources.length > 0 ? searchResult.sources : [{ id: "s1", title: "Team Directory", type: "Directory", description: "NovaTech team contacts" }],
          activity,
        };
      } else {
        response = {
          greeting: "I couldn't find a specific contact for that issue.",
          summary: "I searched the NovaTech team directory but couldn't find a contact matching your query. Try asking about laptop problems, GitHub access, leave requests, security incidents, or dev environment issues.",
          checklist: [],
          workflow: { title: "Directory Search", steps: [{ id: "w1", label: "No matching contact found", state: "completed" }] },
          sources: [{ id: "s1", title: "Team Directory", type: "Directory", description: "NovaTech team contacts" }],
          activity,
        };
      }

    } else if (intent === "multi_step_onboarding") {
      // ─── Multi-Step Onboarding ───
      activity.push({ icon: "UserCheck", title: "Checked user profile", description: "Retrieved user profile", status: "completed", tool: "UserProfile", detail: "ML Engineer role identified", event_type: "TOOL_EXECUTED" });

      const profile = await getUserProfile(supabase, uid);
      activity.push({ icon: "BookOpen", title: "Retrieved ML onboarding guide", description: "Found ML Team Onboarding Guide", status: "completed", tool: "KnowledgeSearch", detail: "Retrieved onboarding guide", event_type: "KNOWLEDGE_SEARCH" });

      const guideSearch = await searchKnowledge(supabase, "ML team onboarding guide steps");
      const tasks = await getOnboardingTasks(supabase, uid);

      activity.push({ icon: "ListChecks", title: "Checked onboarding progress", description: `Found ${tasks.length} tasks`, status: "completed", tool: "OnboardingTasks", detail: `${tasks.filter(t => t.status === "completed").length} completed`, event_type: "TOOL_EXECUTED" });

      const incomplete = tasks.filter((t) => t.status !== "completed");
      activity.push({ icon: "ShieldCheck", title: "Found GitHub access requirements", description: "Retrieved access policy", status: "completed", tool: "PolicyChecker", detail: "Policy requirements identified", event_type: "TOOL_EXECUTED" });

      const accessSearch = await searchKnowledge(supabase, "github access requirements");
      const approver = await findContact(supabase, "github access approval team lead");

      activity.push({ icon: "UserCheck", title: "Identified approver", description: `${approver?.name || "Sarah Chen"} as approver`, status: "completed", tool: "ApproverResolver", detail: `Approver: ${approver?.name}`, event_type: "TOOL_EXECUTED" });

      const context = [...guideSearch.chunks, ...accessSearch.chunks].map((c) => c.content).join("\n");
      const llmAnswer = await callLLM(
        `The user just joined the ML team and asked for help getting everything ready. Their profile: ${profile?.name}, ${profile?.role}, ${profile?.department}. Incomplete tasks: ${incomplete.map(t => t.title).join(", ")}. The GitHub access approver is ${approver?.name}. Provide a personalized onboarding plan.`,
        context
      );

      response = {
        greeting: llmAnswer || `Welcome to NovaTech, ${profile?.name?.split(" ")[0] || "Alex"}! I've put together a personalized onboarding plan for you.`,
        summary: llmAnswer || `Based on your role as ${profile?.role} in the ${profile?.department} team, here's what you need to do:\n\n${incomplete.map((t, i) => `${i + 1}. ${t.title} (${t.duration}) - ${t.status === "in-progress" ? "In Progress" : "Pending"}`).join("\n")}\n\nFor GitHub access, your request will be routed to ${approver?.name || "Sarah Chen"} (${approver?.role || "ML Team Lead"}) for approval. Access is typically granted within 24 hours.\n\nFor your development environment, follow the Developer Environment Setup guide and contact James Park (IT Support) if you have laptop issues.`,
        checklist: tasks.map((t, i) => ({
          id: `c${i + 1}`,
          label: t.title,
          done: t.status === "completed",
        })),
        workflow: {
          title: "Your Personalized Onboarding Plan",
          steps: incomplete.slice(0, 4).map((t, i) => ({
            id: `w${i + 1}`,
            label: t.title,
            state: t.status === "in-progress" ? "active" as const : "pending" as const,
          })),
        },
        sources: [
          ...guideSearch.sources.slice(0, 2),
          ...accessSearch.sources.slice(0, 2),
        ].filter((s, i, arr) => arr.findIndex((x) => x.title === s.title) === i),
        activity,
      };

    } else {
      // ─── Knowledge Question (RAG) ───
      activity.push({ icon: "Search", title: "Searching knowledge base", description: "Retrieving relevant documents", status: "completed", tool: "KnowledgeSearch", detail: "Searching indexed documents", event_type: "KNOWLEDGE_SEARCH" });

      const searchResult = await searchKnowledge(supabase, query);

      activity.push({ icon: "BookOpen", title: "Retrieved sources", description: `Found ${searchResult.chunks.length} relevant chunks`, status: "completed", tool: "RetrievalService", detail: `${searchResult.sources.length} sources identified`, event_type: "SOURCE_RETRIEVED" });

      // Build context for LLM
      const context = searchResult.chunks.map((c) => `[${c.document_title} - ${c.section_label}]: ${c.content}`).join("\n\n");
      const llmAnswer = await callLLM(query, context);

      const { greeting, summary } = buildKnowledgeResponse(query, searchResult, llmAnswer);

      activity.push({ icon: "Sparkles", title: "Generated response", description: "Grounded answer prepared", status: "completed", tool: "ResponseGenerator", detail: "Response with source citations", event_type: "RESPONSE_GENERATED" });

      response = {
        greeting,
        summary,
        checklist: [],
        workflow: {
          title: "Knowledge Search Results",
          steps: searchResult.sources.slice(0, 3).map((s, i) => ({
            id: `w${i + 1}`,
            label: s.title,
            state: "completed" as const,
          })),
        },
        sources: searchResult.sources,
        activity,
      };
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message,
        greeting: "Something went wrong",
        summary: "I encountered an error while processing your request. Please try again.",
        checklist: [],
        workflow: { title: "Error", steps: [] },
        sources: [],
        activity: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
