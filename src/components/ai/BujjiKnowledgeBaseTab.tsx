import React, { useRef, useState } from 'react';
import {
  BookMarked,
  FileText,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { BUJJI_SUBJECTS, type KnowledgeDocument, type RetrievedSource } from '../../types/bujji';
import { Button, Card } from '../ui/Primitives';

interface BujjiKnowledgeBaseTabProps {
  docs: KnowledgeDocument[];
  authHeadersFactory: () => Promise<Record<string, string>>;
  onDocumentIndexed: (doc: KnowledgeDocument) => Promise<void>;
  onDocumentDeleted: (docId: string) => Promise<void>;
  onSendDocToNotes: (doc: KnowledgeDocument) => void;
  onAskAboutDoc: (doc: KnowledgeDocument) => void;
  onError: (msg: string | null) => void;
  showToast: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

export const BujjiKnowledgeBaseTab: React.FC<BujjiKnowledgeBaseTabProps> = ({
  docs,
  authHeadersFactory,
  onDocumentIndexed,
  onDocumentDeleted,
  onSendDocToNotes,
  onAskAboutDoc,
  onError,
  showToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<string>('Computer Science');
  const [chapter, setChapter] = useState('');
  const [textContent, setTextContent] = useState('');
  const [sourceType, setSourceType] = useState<KnowledgeDocument['sourceType']>('notes');
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Live RAG Retrieval Inspector
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RetrievedSource[] | null>(null);
  const [searchMs, setSearchMs] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onError(null);

    if (file.size > 4 * 1024 * 1024) {
      onError('File exceeds the 4 MB limit. Please upload a smaller chapter PDF or text notes.');
      return;
    }

    const baseTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
    if (!title.trim()) setTitle(baseTitle.slice(0, 120));
    setSelectedFileName(file.name);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      setSourceType('pdf');
      const reader = new FileReader();
      reader.onload = () => {
        setPdfBase64(typeof reader.result === 'string' ? reader.result : null);
        setTextContent('');
      };
      reader.readAsDataURL(file);
    } else {
      setSourceType(file.name.toLowerCase().endsWith('.md') ? 'markdown' : 'text');
      setPdfBase64(null);
      const reader = new FileReader();
      reader.onload = () => {
        setTextContent(typeof reader.result === 'string' ? reader.result.slice(0, 60_000) : '');
      };
      reader.readAsText(file);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);
    if (!title.trim()) {
      onError('Please give your study material a clear title.');
      return;
    }
    if (!pdfBase64 && textContent.trim().length < 20) {
      onError('Please upload a PDF/text file or paste at least 20 characters of study notes.');
      return;
    }

    setUploading(true);
    try {
      const headers = await authHeadersFactory();
      const res = await fetch('/api/ai/kb/ingest', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim(),
          subject,
          chapter: chapter.trim(),
          sourceType,
          textContent: pdfBase64 ? undefined : textContent.trim(),
          pdfBase64: pdfBase64 || undefined,
          generateSummary: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(data.error || 'Could not index this study document.');
        return;
      }

      await onDocumentIndexed(data.document as KnowledgeDocument);
      showToast(
        `Indexed "${data.document.title}" (${data.document.chunkCount} semantic chunks${data.embedded ? ' + embeddings' : ''})!`,
        'success'
      );
      setTitle('');
      setChapter('');
      setTextContent('');
      setPdfBase64(null);
      setSelectedFileName(null);
      setSourceType('notes');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      onError('Network error while indexing document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleTestRetrieval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    onError(null);
    try {
      const headers = await authHeadersFactory();
      const res = await fetch('/api/ai/kb/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: searchQuery.trim(),
          topK: 4,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(data.error || 'Knowledge search failed.');
        return;
      }
      setSearchResults(data.sources || []);
      setSearchMs(typeof data.retrievalMs === 'number' ? data.retrievalMs : null);
    } catch {
      onError('Could not run knowledge search.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Upload & Index Form */}
      <Card>
        <form onSubmit={handleIngest} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-black text-[#20202A]">
                Add Curriculum Notes or PDF
              </h2>
              <p className="text-xs text-[#777783]">
                Bujji chunks, embeds, and cites your private notes whenever you ask related questions.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                onChange={handleFileChange}
                className="hidden"
                id="bujji-kb-file"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Upload PDF / TXT / MD
              </Button>
            </div>
          </div>

          {selectedFileName && (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#E9DFFF]/70 px-3.5 py-2 text-xs font-bold text-[#5230BA]">
              <span className="truncate">Selected file: {selectedFileName}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFileName(null);
                  setPdfBase64(null);
                  setSourceType('notes');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="underline cursor-pointer shrink-0"
              >
                Clear
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="kb-title" className="block text-xs font-bold text-[#777783] mb-1">
                Document Title
              </label>
              <input
                id="kb-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Thermodynamics Chapter 4"
                className="w-full min-h-[42px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="kb-subject" className="block text-xs font-bold text-[#777783] mb-1">
                Subject
              </label>
              <select
                id="kb-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full min-h-[42px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              >
                {BUJJI_SUBJECTS.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="kb-chapter" className="block text-xs font-bold text-[#777783] mb-1">
                Chapter / Unit (Optional)
              </label>
              <input
                id="kb-chapter"
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g. Laws of Entropy"
                className="w-full min-h-[42px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>
          </div>

          {!pdfBase64 && (
            <div>
              <label htmlFor="kb-content" className="block text-xs font-bold text-[#777783] mb-1">
                Paste Study Notes, Textbook Excerpt, or Syllabus
              </label>
              <textarea
                id="kb-content"
                rows={4}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste class notes, formulas, definitions, or chapter text here..."
                className="w-full rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-[#777783]">
              Stored privately in your StudyDuo account — never shared with other users.
            </p>
            <Button type="submit" disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookMarked className="h-4 w-4" />}
              {uploading ? 'Indexing & Embedding...' : 'Index into Bujji KB'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Live Retrieval Quality Tester */}
      {docs.length > 0 && (
        <Card className="space-y-3">
          <form onSubmit={handleTestRetrieval} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-[#8B8A99] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Test semantic retrieval across your indexed notes..."
                className="w-full min-h-[42px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] pl-10 pr-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>
            <Button type="submit" variant="secondary" disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Test Retrieval
            </Button>
          </form>

          {searchResults !== null && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-[#777783]">
                <span>
                  {searchResults.length > 0
                    ? `Matched ${searchResults.length} relevant source chunk${searchResults.length === 1 ? '' : 's'}`
                    : 'No closely matching passages found in your uploaded docs.'}
                </span>
                {searchMs !== null && <span className="font-mono">{searchMs}ms</span>}
              </div>
              {searchResults.map((src) => (
                <div
                  key={src.chunkId}
                  className="rounded-2xl border border-[#E9DFFF] bg-[#FAF8FF] p-3 text-xs space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold text-[#20202A]">
                      {src.docTitle} {src.chapter ? `· ${src.chapter}` : ''}
                    </span>
                    <span className="rounded-full bg-[#E2F5E9] px-2 py-0.5 font-mono font-bold text-[#1F874D]">
                      Score {Math.round(src.score * 100)}%
                    </span>
                  </div>
                  <p className="text-[#4C4B5C] leading-relaxed">{src.excerpt}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Indexed Document Library */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-black text-[#20202A]">
            Your Indexed Study Materials ({docs.length})
          </h3>
        </div>

        {docs.length === 0 ? (
          <Card className="text-center py-8 space-y-2">
            <BookMarked className="h-8 w-8 text-[#A68BF5] mx-auto" />
            <p className="font-display text-base font-extrabold text-[#20202A]">
              No study documents indexed yet
            </p>
            <p className="text-xs text-[#777783] max-w-md mx-auto">
              Upload a chapter PDF or paste lecture notes above. Bujji will automatically retrieve and cite your notes during chats and quizzes.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {docs.map((docItem) => (
              <Card key={docItem.id} className="flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="rounded-full bg-[#E9DFFF] px-2.5 py-0.5 text-[11px] font-extrabold text-[#7651E8]">
                          {docItem.subject}
                        </span>
                        <span className="rounded-full bg-[#F8F5FF] px-2 py-0.5 text-[10px] font-mono uppercase text-[#777783]">
                          {docItem.sourceType}
                        </span>
                        <span className="text-[11px] font-mono text-[#777783]">
                          {docItem.chunkCount} chunks
                        </span>
                      </div>
                      <h4 className="font-display text-base font-black text-[#20202A] truncate">
                        {docItem.title}
                      </h4>
                      {docItem.chapter && (
                        <p className="text-xs font-semibold text-[#777783]">{docItem.chapter}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void onDocumentDeleted(docItem.id)}
                      aria-label={`Delete ${docItem.title}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[#8B8A99] hover:bg-[#FFF0F3] hover:text-[#D9365E] transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {docItem.summary && (
                    <p className="text-xs text-[#5C5C6C] leading-relaxed line-clamp-3">
                      {docItem.summary}
                    </p>
                  )}

                  {docItem.keyConcepts.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {docItem.keyConcepts.slice(0, 5).map((concept) => (
                        <span
                          key={concept}
                          className="rounded-full bg-[#FFF0C9]/70 px-2.5 py-0.5 text-[11px] font-semibold text-[#7A5100]"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-[#F0EDF5]">
                  <button
                    type="button"
                    onClick={() => onAskAboutDoc(docItem)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#7651E8] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#6440D6] cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Ask Bujji
                  </button>
                  <button
                    type="button"
                    onClick={() => onSendDocToNotes(docItem)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#F8F5FF] border border-[#E9DFFF] px-3.5 py-1.5 text-xs font-bold text-[#7651E8] hover:bg-[#E9DFFF] cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Flashcards & Summary
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
