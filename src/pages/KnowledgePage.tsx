import { useState, useRef } from 'react';
import type { KnowledgeDoc } from '@/types';
import { Reveal } from '@/components/Reveal';
import { ingestDocument } from '@/lib/agent';
import {
  FileText,
  FileCode,
  Upload,
  Search,
  CheckCircle2,
  Loader2,
  Clock,
  ArrowRight,
  X,
} from 'lucide-react';

interface KnowledgePageProps {
  docs: KnowledgeDoc[];
  onToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onDocsChanged?: () => void;
}

export function KnowledgePage({ docs: initialDocs, onToast, onDocsChanged }: KnowledgePageProps) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(initialDocs);
  const [search, setSearch] = useState('');
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'processing' | 'indexed'>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = docs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()));

  const handleUpload = async (file?: File) => {
    if (uploadState !== 'idle' && uploadState !== 'indexed') return;

    // If no file provided (click upload without drag), trigger file picker
    if (!file) {
      fileInputRef.current?.click();
      return;
    }

    // Validate file type
    const validTypes = ['text/plain', 'text/markdown', 'application/pdf', 'application/octet-stream'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['txt', 'md', 'markdown', 'pdf', 'docx'];
    if (!validExts.includes(ext || '') && !validTypes.includes(file.type)) {
      onToast('Unsupported file type. Please upload PDF, TXT, or Markdown files.', 'error');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      onToast('File too large. Maximum size is 10MB.', 'error');
      return;
    }

    setUploadState('uploading');
    setTimeout(() => setUploadState('processing'), 600);

    try {
      const result = await ingestDocument(file);
      setUploadState('indexed');
      const newDoc: KnowledgeDoc = {
        id: `k${Date.now()}`,
        title: result.title,
        type: result.type,
        size: result.size,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        status: 'indexed',
        sections: result.sections,
      };
      setDocs((prev) => [newDoc, ...prev]);
      onToast(`Document indexed: ${result.title} (${result.sections} sections)`, 'success');
      onDocsChanged?.();
      setTimeout(() => setUploadState('idle'), 1500);
    } catch (err) {
      setUploadState('idle');
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload document';
      onToast(`Upload failed: ${errorMsg}`, 'error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <Reveal>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">Knowledge Base</h1>
          <p className="text-sm text-neutral-500">Documents indexed for AI-powered search and retrieval.</p>
        </div>
      </Reveal>

      {/* Upload area */}
      <Reveal delay={60}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.markdown,.pdf,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const file = e.dataTransfer.files?.[0]; handleUpload(file); }}
          onClick={() => handleUpload()}
          className={`
            relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200
            ${isDragOver ? 'border-primary-400 bg-primary-50/50 scale-[1.01]' : 'border-neutral-300 bg-neutral-50/50 hover:border-primary-300 hover:bg-primary-50/30'}
          `}
        >
          {uploadState === 'idle' || uploadState === 'indexed' ? (
            <>
              <div className={`flex items-center justify-center w-14 h-14 rounded-2xl mx-auto mb-4 transition-all duration-200 ${isDragOver ? 'bg-primary-500 text-white scale-110' : 'bg-white text-primary-500 shadow-sm'}`}>
                <Upload size={24} className={isDragOver ? 'animate-bounce-subtle' : ''} />
              </div>
              <p className="text-sm font-semibold text-neutral-700 mb-1">
                {uploadState === 'indexed' ? 'Document indexed successfully!' : 'Drop a document here or click to upload'}
              </p>
              <p className="text-xs text-neutral-500">
                PDF, Markdown, DOCX — up to 10MB. Automatically indexed for AI search.
              </p>
              {uploadState === 'indexed' && (
                <div className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-success-50 text-success-700 text-xs font-medium px-3 py-1 border border-success-200 animate-scale-in">
                  <CheckCircle2 size={13} />
                  Indexed
                </div>
              )}
            </>
          ) : (
            <div className="py-2">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl mx-auto mb-4 bg-primary-500 text-white">
                {uploadState === 'uploading' ? (
                  <Upload size={24} className="animate-pulse" />
                ) : (
                  <Loader2 size={24} className="animate-spin" />
                )}
              </div>
              <p className="text-sm font-semibold text-neutral-700 mb-1">
                {uploadState === 'uploading' ? 'Uploading...' : 'Processing & indexing...'}
              </p>
              <p className="text-xs text-neutral-500">
                {uploadState === 'uploading' ? 'Transferring document to knowledge base' : 'Extracting sections and building search index'}
              </p>
              {/* Progress bar */}
              <div className="mt-4 max-w-xs mx-auto h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500 ease-smooth"
                  style={{ width: uploadState === 'uploading' ? '40%' : '85%' }}
                />
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* Search bar */}
      <Reveal delay={100}>
        <div className="mt-6 mb-4 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 transition-all duration-200 focus-within:border-primary-300">
          <Search size={16} className="text-neutral-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="flex-1 bg-transparent text-sm text-neutral-700 placeholder:text-neutral-400 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-neutral-400 hover:text-neutral-600 transition-colors">
              <X size={15} />
            </button>
          )}
        </div>
      </Reveal>

      {/* Document grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((doc, i) => (
          <Reveal key={doc.id} delay={i * 60}>
            <DocumentCard doc={doc} onToast={onToast} />
          </Reveal>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-400 mb-4 animate-float">
            <Search size={24} />
          </div>
          <p className="text-sm font-medium text-neutral-600">No documents found</p>
          <p className="text-xs text-neutral-400 mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}

function DocumentCard({ doc, onToast }: { doc: KnowledgeDoc; onToast: (msg: string, type?: 'success' | 'info' | 'error') => void }) {
  const Icon = doc.type === 'Markdown' ? FileCode : FileText;

  return (
    <div className="group card-hover rounded-xl border border-neutral-200 bg-white p-4 h-full">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-100 text-neutral-500 transition-all duration-200 group-hover:scale-110 group-hover:bg-primary-50 group-hover:text-primary-600 flex-shrink-0">
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-neutral-900 truncate group-hover:text-primary-700 transition-colors">{doc.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-medium text-neutral-400 bg-neutral-100 rounded px-1.5 py-0.5">{doc.type}</span>
            <span className="text-[10px] text-neutral-400">{doc.size}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {doc.status === 'indexed' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success-600">
              <CheckCircle2 size={11} />
              {doc.sections} sections indexed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary-600">
              <Loader2 size={11} className="animate-spin" />
              Processing
            </span>
          )}
          <span className="text-[10px] text-neutral-400 flex items-center gap-0.5 ml-1">
            <Clock size={9} />
            {doc.date}
          </span>
        </div>
        <button
          onClick={() => onToast(`Opening: ${doc.title}`, 'info')}
          className="flex items-center gap-1 text-[11px] font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-all duration-200"
        >
          Open
          <ArrowRight size={11} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
