'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  buildDocumentIndex,
  createStoredPageIndexes,
  searchDocumentIndex,
  type DocumentIndex,
  type DocumentPage,
  type PageSearchResult,
} from '@/utils/doc-search';
import {
  deleteSavedDocument,
  listSavedDocuments,
  loadSavedDocument,
  saveDocumentToStore,
  type SavedDocument,
} from '@/utils/doc-store';

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

      const pageIndexes = await createStoredPageIndexes(searchablePages);
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
    <section className="bg-[#fbfaf6]">
      <div className="mx-auto max-w-7xl px-4 py-xxl md:px-8">
        <div className="mb-xl max-w-[820px]">
          <span className="font-label-sm text-[11px] text-slate-500">文档阅读助手</span>
          <h1 className="mt-sm font-h1 text-[48px] leading-tight text-slate-950 md:text-[60px]">文档智问</h1>
          <p className="mt-md font-body-lg text-[20px] leading-9 text-slate-600">
            上传 PDF 后围绕文档内容提问，用页级命中结果把答案直接落到原文位置。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white p-lg shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="mb-lg">
            <span className="mb-sm inline-flex rounded-lg bg-[#ecf3ff] px-3 py-1 font-label-sm text-[11px] text-[#2170e4]">
              PDF 阅读 · 智能定位
            </span>
            <h2 className="font-h2 text-[32px] leading-tight text-slate-950">本地文档工作台</h2>
            <p className="mt-sm font-body-md text-[15px] leading-7 text-slate-600">
              适合快速阅读白皮书、研究报告和产品说明文档。
            </p>
          </div>

          <label className="block rounded-lg border border-dashed border-slate-300 bg-[#fbfaf6] p-lg text-center transition-colors hover:border-[#2170e4]">
            <input
              accept="application/pdf"
              className="sr-only"
              type="file"
              onChange={(event) => void handleFileChange(event.target.files?.[0])}
            />
            <span className="block font-h3 text-[24px] leading-tight text-slate-950">上传 PDF</span>
            <span className="mt-xs block font-body-md text-[15px] leading-7 text-slate-600">
              {fileName || '选择一份可复制文本的 PDF 文档'}
            </span>
          </label>

          {savedDocuments.length > 0 && (
            <div className="mt-lg">
              <div className="mb-sm flex items-center justify-between">
                <span className="font-label-sm text-[11px] text-slate-500">
                  本地文档
                </span>
                <span className="font-label-sm text-[11px] text-slate-500">
                  最近使用
                </span>
              </div>
              <div className="space-y-sm">
                {savedDocuments.map((document) => (
                  <div
                    key={document.id}
                    className={`rounded-lg border p-sm ${
                      activeDocumentId === document.id
                        ? 'border-[#2170e4] bg-[#ecf3ff]'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <button
                      className="block w-full border-0 bg-transparent p-0 text-left"
                      type="button"
                      onClick={() => void activateSavedDocument(document.id)}
                    >
                      <span className="block truncate font-nav-link text-[14px] font-semibold text-slate-950">
                        {document.fileName}
                      </span>
                      <span className="mt-1 block font-label-sm text-[11px] text-slate-500">
                        {document.pageCount} 页 · {new Date(document.updatedAt).toLocaleDateString('zh-CN')}
                      </span>
                    </button>
                    <button
                      className="mt-xs border-0 bg-transparent p-0 font-label-sm text-[11px] text-slate-500 underline-offset-4 hover:text-error hover:underline"
                      type="button"
                      onClick={() => void handleDeleteDocument(document.id)}
                    >
                      删除本地副本
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-lg rounded-lg bg-[#f5f2ea] p-md font-body-md text-[15px] leading-7 text-slate-600">
            {status === 'idle' && '等待上传文档。'}
            {status === 'reading' && '正在读取 PDF 页面，并用 MiniLM 生成本地语义向量...'}
            {status === 'loading' && '正在恢复文档和阅读进度...'}
            {status === 'ready' && index && `索引完成并已本地保存：${index.pages.length} 页可搜索内容。`}
            {status === 'error' && error}
          </div>

          <form className="mt-lg" onSubmit={handleAsk}>
            <label className="font-label-sm text-[11px] text-slate-500" htmlFor="doc-question">
              提问
            </label>
            <textarea
              id="doc-question"
              className="mt-sm min-h-28 w-full resize-none rounded-lg border border-slate-200 bg-white p-md font-body-md text-[15px] leading-7 text-slate-950 outline-none transition-colors focus:border-[#2170e4]"
              disabled={!index}
              placeholder="例如：这份文档里如何描述 RAG 架构？"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              className="mt-md w-full rounded-lg bg-slate-950 px-5 py-3 font-nav-link text-[14px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!index || !query.trim() || isSearching}
              type="submit"
            >
              {isSearching ? '检索中...' : '定位最佳页面'}
            </button>
          </form>

          {answer && (
            <div className="mt-lg rounded-lg border border-slate-200 bg-white p-md">
              <div className="flex items-center justify-between gap-sm">
                <span className="font-label-sm text-[11px] text-slate-500">最佳命中</span>
                <span className="rounded-lg bg-[#2170e4] px-3 py-1 font-label-sm text-[11px] text-white">
                  第 {answer.pageIndex + 1} 页 · {formatScore(answer.score)}
                </span>
              </div>
              <div className="mt-md space-y-sm">
                {answer.highlights.map((highlight) => (
                  <p key={highlight} className="font-body-md text-[15px] leading-7 text-slate-600">
                    {highlight}
                  </p>
                ))}
              </div>
            </div>
          )}
        </aside>

        <div className="min-h-[720px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          {viewerUrl ? (
            <iframe
              key={viewerUrl}
              className="h-[720px] w-full"
              src={viewerUrl}
              title="PDF preview"
            />
          ) : (
            <div className="flex h-[720px] items-center justify-center p-lg text-center font-body-lg text-[20px] leading-9 text-slate-500">
              上传后将在这里预览 PDF 原文。
            </div>
          )}
        </div>
        </div>
      </div>
    </section>
  );
}
