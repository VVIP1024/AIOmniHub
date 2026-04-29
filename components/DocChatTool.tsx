'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  buildDocumentIndex,
  createStoredPageIndexes,
  searchDocumentIndex,
  type DocumentIndex,
  type DocumentPage,
  type PageSearchResult,
} from '@/lib/doc-search';
import {
  deleteSavedDocument,
  listSavedDocuments,
  loadSavedDocument,
  saveDocumentToStore,
  type SavedDocument,
} from '@/lib/doc-store';

type ProcessingState = 'idle' | 'reading' | 'loading' | 'ready' | 'error';

async function extractPdfPages(file: File): Promise<DocumentPage[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString();

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: DocumentPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pages.push({
      pageIndex: pageNumber - 1,
      text,
    });
  }

  return pages;
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export default function DocChatTool() {
  const [status, setStatus] = useState<ProcessingState>('idle');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [index, setIndex] = useState<DocumentIndex | null>(null);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<PageSearchResult | null>(null);
  const [savedDocuments, setSavedDocuments] = useState<SavedDocument[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const viewerUrl = useMemo(() => {
    if (!fileUrl) return '';
    const pageNumber = answer ? answer.pageIndex + 1 : 1;
    return `${fileUrl}#page=${pageNumber}&zoom=page-width`;
  }, [answer, fileUrl]);

  useEffect(() => {
    void refreshSavedDocuments();

    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  async function refreshSavedDocuments() {
    setSavedDocuments(await listSavedDocuments());
  }

  function replaceFileUrl(file: Blob) {
    setFileUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return URL.createObjectURL(file);
    });
  }

  async function activateSavedDocument(documentId: string) {
    setStatus('loading');
    setError('');
    setAnswer(null);
    setQuery('');

    try {
      const saved = await loadSavedDocument(documentId);
      if (!saved) throw new Error('没有找到本地保存的文档。');

      setIndex(await buildDocumentIndex(saved.pages, saved.pageIndexes));
      setFileName(saved.document.fileName);
      setActiveDocumentId(saved.document.id);
      replaceFileUrl(saved.document.file);
      setStatus('ready');
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : '恢复本地文档失败。');
    }
  }

  async function handleDeleteDocument(documentId: string) {
    await deleteSavedDocument(documentId);
    await refreshSavedDocuments();

    if (documentId === activeDocumentId) {
      setActiveDocumentId('');
      setFileName('');
      setFileUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return '';
      });
      setIndex(null);
      setAnswer(null);
      setStatus('idle');
    }
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return;

    setStatus('reading');
    setError('');
    setAnswer(null);
    setQuery('');
    setFileName(file.name);
    replaceFileUrl(file);

    try {
      const pages = await extractPdfPages(file);
      const searchablePages = pages.filter((page) => page.text.length > 0);

      if (searchablePages.length === 0) {
        throw new Error('没有从 PDF 中读取到可搜索文本，可能是扫描件或图片型 PDF。');
      }

      const pageIndexes = createStoredPageIndexes(searchablePages);
      const documentId = await saveDocumentToStore(file, searchablePages, pageIndexes);

      setIndex(await buildDocumentIndex(searchablePages, pageIndexes));
      setActiveDocumentId(documentId);
      await refreshSavedDocuments();
      setStatus('ready');
    } catch (cause) {
      setStatus('error');
      setIndex(null);
      setError(cause instanceof Error ? cause.message : 'PDF 解析失败，请换一个文件试试。');
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!index) return;

    setIsSearching(true);
    try {
      const result = await searchDocumentIndex(index, query);
      setAnswer(result);
      if (!result) {
        setError('没有匹配到足够相关的页面，请换一种问法。');
      } else {
        setError('');
      }
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section className="max-w-container-max mx-auto px-gutter py-xxl">
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
          <div className="mb-lg">
            <span className="mb-sm inline-flex rounded-full bg-secondary-container/10 px-3 py-1 font-label-sm text-label-sm text-secondary-container">
              LOCAL DOC CHAT
            </span>
            <h1 className="font-h1 text-h1 text-on-surface">Document Q&amp;A</h1>
            <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
              上传 PDF 后，使用 Dexie/IndexedDB 本地保存文档，用 Orama 全文搜索结合本地向量分数完成页级问答。
            </p>
          </div>

          <label className="block rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-lg text-center transition-colors hover:border-secondary-container">
            <input
              accept="application/pdf"
              className="sr-only"
              type="file"
              onChange={(event) => void handleFileChange(event.target.files?.[0])}
            />
            <span className="block font-h3 text-h3 text-on-surface">Upload PDF</span>
            <span className="mt-xs block font-body-md text-body-md text-on-surface-variant">
              {fileName || '选择一份可复制文本的 PDF 文档'}
            </span>
          </label>

          {savedDocuments.length > 0 && (
            <div className="mt-lg">
              <div className="mb-sm flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Saved locally
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  IndexedDB
                </span>
              </div>
              <div className="space-y-sm">
                {savedDocuments.map((document) => (
                  <div
                    key={document.id}
                    className={`rounded-xl border p-sm ${
                      activeDocumentId === document.id
                        ? 'border-secondary-container bg-secondary-container/5'
                        : 'border-outline-variant bg-white'
                    }`}
                  >
                    <button
                      className="block w-full border-0 bg-transparent p-0 text-left"
                      type="button"
                      onClick={() => void activateSavedDocument(document.id)}
                    >
                      <span className="block truncate font-nav-link text-nav-link text-on-surface">
                        {document.fileName}
                      </span>
                      <span className="mt-1 block font-label-sm text-label-sm text-on-surface-variant">
                        {document.pageCount} pages · {new Date(document.updatedAt).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      className="mt-xs border-0 bg-transparent p-0 font-label-sm text-label-sm text-on-surface-variant underline-offset-4 hover:text-error hover:underline"
                      type="button"
                      onClick={() => void handleDeleteDocument(document.id)}
                    >
                      Delete local copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-lg rounded-xl bg-surface-container-low p-md font-body-md text-body-md text-on-surface-variant">
            {status === 'idle' && '等待上传文档。'}
            {status === 'reading' && '正在读取 PDF 页面并建立本地索引...'}
            {status === 'loading' && '正在从 IndexedDB 恢复 PDF 和索引...'}
            {status === 'ready' && index && `索引完成并已本地保存：${index.pages.length} 页可搜索内容。`}
            {status === 'error' && error}
          </div>

          <form className="mt-lg" onSubmit={handleAsk}>
            <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="doc-question">
              Ask a question
            </label>
            <textarea
              id="doc-question"
              className="mt-sm min-h-28 w-full resize-none rounded-xl border border-outline-variant bg-white p-md font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-secondary-container"
              disabled={!index}
              placeholder="例如：这份文档里如何描述 RAG 架构？"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              className="mt-md w-full rounded-xl bg-primary px-5 py-3 font-nav-link text-nav-link text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!index || !query.trim() || isSearching}
              type="submit"
            >
              {isSearching ? 'Searching...' : 'Find Best Page'}
            </button>
          </form>

          {answer && (
            <div className="mt-lg rounded-xl border border-outline-variant bg-white p-md">
              <div className="flex items-center justify-between gap-sm">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Best match</span>
                <span className="rounded-full bg-secondary-container px-3 py-1 font-label-sm text-label-sm text-on-secondary">
                  Page {answer.pageIndex + 1} · {formatScore(answer.score)}
                </span>
              </div>
              <div className="mt-md space-y-sm">
                {answer.highlights.map((highlight) => (
                  <p key={highlight} className="font-body-md text-body-md text-on-surface-variant">
                    {highlight}
                  </p>
                ))}
              </div>
            </div>
          )}
        </aside>

        <div className="min-h-[720px] overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          {viewerUrl ? (
            <iframe
              key={viewerUrl}
              className="h-[720px] w-full"
              src={viewerUrl}
              title="PDF preview"
            />
          ) : (
            <div className="flex h-[720px] items-center justify-center p-lg text-center font-body-lg text-body-lg text-on-surface-variant">
              PDF preview will appear here after upload.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
