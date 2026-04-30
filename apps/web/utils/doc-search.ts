import { create, insertMultiple, search } from '@orama/orama';

export interface DocumentPage {
  pageIndex: number;
  text: string;
}

export interface PageSearchResult extends DocumentPage {
  score: number;
  highlights: string[];
}

export interface StoredPageIndex {
  pageIndex: number;
  tokens: string[];
  embedding: number[];
}

interface IndexedPage extends DocumentPage {
  embedding: number[];
}

interface OramaSearchHit {
  score: number;
  document: {
    pageIndex: number;
  };
}

interface OramaSearchResult {
  hits: OramaSearchHit[];
}

export interface DocumentIndex {
  pages: DocumentPage[];
  indexedPages: IndexedPage[];
  orama: unknown;
}

interface FeatureExtractionOutput {
  data: Float32Array | number[];
}

type FeatureExtractor = (
  input: string,
  options: { pooling: 'mean'; normalize: true },
) => Promise<FeatureExtractionOutput>;

interface TransformersModule {
  env: {
    allowLocalModels?: boolean;
    useBrowserCache?: boolean;
  };
  pipeline: (task: 'feature-extraction', model: string) => Promise<FeatureExtractor>;
}

const TOKEN_PATTERN = /[a-z0-9]+|[\u4e00-\u9fff]/gi;
const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'are',
  'was',
  'were',
  'you',
  'your',
  'have',
  'has',
  '什么',
  '如何',
  '为什么',
  '一个',
  '我们',
  '可以',
]);

const searchOrama = search as unknown as (
  db: unknown,
  params: { term: string; properties: string[]; limit: number },
) => Promise<OramaSearchResult>;

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
const MAX_EMBEDDING_CHARS = 4000;

let extractorPromise: Promise<FeatureExtractor> | null = null;

async function getEmbeddingExtractor(): Promise<FeatureExtractor> {
  if (!extractorPromise) {
    const importFromCdn = new Function('url', 'return import(url)') as (
      url: string,
    ) => Promise<TransformersModule>;

    extractorPromise = importFromCdn(TRANSFORMERS_CDN).then(async ({ env, pipeline }) => {
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      return pipeline('feature-extraction', MODEL_ID);
    });
  }

  return extractorPromise;
}

export function tokenizeDocumentText(text: string): string[] {
  const rawTokens = text.toLowerCase().match(TOKEN_PATTERN) ?? [];
  const tokens: string[] = [];
  let chineseBuffer = '';

  for (const token of rawTokens) {
    if (/^[\u4e00-\u9fff]$/.test(token)) {
      chineseBuffer += token;
      continue;
    }

    if (chineseBuffer.length > 0) {
      for (let index = 0; index < chineseBuffer.length - 1; index += 1) {
        tokens.push(chineseBuffer.slice(index, index + 2));
      }
      chineseBuffer = '';
    }

    tokens.push(token);
  }

  if (chineseBuffer.length > 0) {
    for (let index = 0; index < chineseBuffer.length - 1; index += 1) {
      tokens.push(chineseBuffer.slice(index, index + 2));
    }
  }

  return tokens.filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function cosineSimilarity(left: number[], right: number[]): number {
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  const length = Math.min(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function extractHighlights(text: string, queryTokens: string[]): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？.!?])\s*/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const matched = sentences.filter((sentence) => {
    const lowered = sentence.toLowerCase();
    return queryTokens.some((token) => lowered.includes(token));
  });

  return (matched.length > 0 ? matched : sentences).slice(0, 3);
}

function toEmbeddingText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_EMBEDDING_CHARS);
}

async function embedText(text: string): Promise<number[]> {
  const extractor = await getEmbeddingExtractor();
  const output = await extractor(toEmbeddingText(text), { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

async function getPageEmbedding(page: DocumentPage, storedPageIndexes: StoredPageIndex[]): Promise<number[]> {
  const stored = storedPageIndexes.find((pageIndex) => pageIndex.pageIndex === page.pageIndex);
  if (stored?.embedding?.length) return stored.embedding;
  return embedText(page.text);
}

export async function createStoredPageIndexes(pages: DocumentPage[]): Promise<StoredPageIndex[]> {
  const pageIndexes: StoredPageIndex[] = [];

  for (const page of pages) {
    pageIndexes.push({
      pageIndex: page.pageIndex,
      tokens: tokenizeDocumentText(page.text),
      embedding: await embedText(page.text),
    });
  }

  return pageIndexes;
}

export async function buildDocumentIndex(
  pages: DocumentPage[],
  storedPageIndexes?: StoredPageIndex[],
): Promise<DocumentIndex> {
  const pageIndexes = storedPageIndexes ?? (await createStoredPageIndexes(pages));
  const orama = await create({
    schema: {
      pageIndex: 'number',
      text: 'string',
    },
  });

  await insertMultiple(
    orama,
    pages.map((page) => ({
      pageIndex: page.pageIndex,
      text: page.text,
    })),
  );

  const indexedPages: IndexedPage[] = [];
  for (const page of pages) {
    indexedPages.push({
      ...page,
      embedding: await getPageEmbedding(page, pageIndexes),
    });
  }

  return {
    pages,
    orama,
    indexedPages,
  };
}

export async function searchDocumentIndex(index: DocumentIndex, query: string): Promise<PageSearchResult | null> {
  const queryTokens = tokenizeDocumentText(query);
  if (queryTokens.length === 0) return null;

  const queryEmbedding = await embedText(query);
  const fullTextResults = await searchOrama(index.orama, {
    term: query,
    properties: ['text'],
    limit: index.pages.length,
  });
  const keywordScores = new Map<number, number>();

  for (const hit of fullTextResults.hits) {
    keywordScores.set(hit.document.pageIndex, hit.score);
  }

  const maxKeywordScore = Math.max(...Array.from(keywordScores.values()), 1);
  const ranked = index.indexedPages
    .map((page) => {
      const semanticScore = cosineSimilarity(page.embedding, queryEmbedding);
      const keywordScore = (keywordScores.get(page.pageIndex) ?? 0) / maxKeywordScore;
      const score = semanticScore * 0.75 + keywordScore * 0.25;

      return {
        ...page,
        score,
        highlights: extractHighlights(page.text, queryTokens),
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score ? ranked[0] : null;
}
