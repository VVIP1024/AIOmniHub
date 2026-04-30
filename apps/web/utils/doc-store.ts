import Dexie, { type Table } from 'dexie';
import type { DocumentPage, StoredPageIndex } from '@/utils/doc-search';

export interface SavedDocument {
  id: string;
  fileName: string;
  file: Blob;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface StoredDocumentPage extends DocumentPage {
  id: string;
  documentId: string;
}

interface StoredDocumentPageIndex extends StoredPageIndex {
  id: string;
  documentId: string;
}

class DocChatDatabase extends Dexie {
  documents!: Table<SavedDocument, string>;
  pages!: Table<StoredDocumentPage, string>;
  pageIndexes!: Table<StoredDocumentPageIndex, string>;

  constructor() {
    super('ai-omni-hub-doc-chat');

    this.version(1).stores({
      documents: 'id, fileName, createdAt, updatedAt',
      pages: 'id, documentId, [documentId+pageIndex]',
      pageIndexes: 'id, documentId, [documentId+pageIndex]',
    });
  }
}

export const docChatDb = new DocChatDatabase();

function createDocumentId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export async function saveDocumentToStore(
  file: File,
  pages: DocumentPage[],
  pageIndexes: StoredPageIndex[],
): Promise<string> {
  const id = createDocumentId(file);
  const now = new Date().toISOString();

  await docChatDb.transaction('rw', docChatDb.documents, docChatDb.pages, docChatDb.pageIndexes, async () => {
    await docChatDb.documents.put({
      id,
      fileName: file.name,
      file,
      pageCount: pages.length,
      createdAt: now,
      updatedAt: now,
    });

    await docChatDb.pages.where('documentId').equals(id).delete();
    await docChatDb.pageIndexes.where('documentId').equals(id).delete();

    await docChatDb.pages.bulkPut(
      pages.map((page) => ({
        ...page,
        id: `${id}:${page.pageIndex}`,
        documentId: id,
      })),
    );

    await docChatDb.pageIndexes.bulkPut(
      pageIndexes.map((pageIndex) => ({
        ...pageIndex,
        id: `${id}:${pageIndex.pageIndex}`,
        documentId: id,
      })),
    );
  });

  return id;
}

export async function listSavedDocuments(): Promise<SavedDocument[]> {
  return docChatDb.documents.orderBy('updatedAt').reverse().toArray();
}

export async function loadSavedDocument(documentId: string): Promise<{
  document: SavedDocument;
  pages: DocumentPage[];
  pageIndexes: StoredPageIndex[];
} | null> {
  const document = await docChatDb.documents.get(documentId);
  if (!document) return null;

  const [pages, pageIndexes] = await Promise.all([
    docChatDb.pages.where('documentId').equals(documentId).sortBy('pageIndex'),
    docChatDb.pageIndexes.where('documentId').equals(documentId).sortBy('pageIndex'),
  ]);

  return {
    document,
    pages: pages.map(({ pageIndex, text }) => ({ pageIndex, text })),
    pageIndexes: pageIndexes.map(({ pageIndex, tokens, embedding }) => ({ pageIndex, tokens, embedding })),
  };
}

export async function deleteSavedDocument(documentId: string): Promise<void> {
  await docChatDb.transaction('rw', docChatDb.documents, docChatDb.pages, docChatDb.pageIndexes, async () => {
    await docChatDb.documents.delete(documentId);
    await docChatDb.pages.where('documentId').equals(documentId).delete();
    await docChatDb.pageIndexes.where('documentId').equals(documentId).delete();
  });
}
