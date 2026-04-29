export interface DocumentPage {
  pageIndex: number;
  text: string;
}

export interface PageSearchResult extends DocumentPage {
  score: number;
  highlights: string[];
}

interface IndexedPage extends DocumentPage {
  vector: Map<string, number>;
}

export interface DocumentIndex {
  pages: DocumentPage[];
  indexedPages: IndexedPage[];
  documentFrequency: Map<string, number>;
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

function tokenize(text: string): string[] {
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

function termFrequency(tokens: string[]): Map<string, number> {
  const vector = new Map<string, number>();
  for (const token of tokens) {
    vector.set(token, (vector.get(token) ?? 0) + 1);
  }

  const maxFrequency = Math.max(...Array.from(vector.values()), 1);
  for (const [token, count] of Array.from(vector.entries())) {
    vector.set(token, count / maxFrequency);
  }

  return vector;
}

function buildDocumentFrequency(pageTokens: string[][]): Map<string, number> {
  const documentFrequency = new Map<string, number>();

  for (const tokens of pageTokens) {
    for (const token of Array.from(new Set(tokens))) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  return documentFrequency;
}

function applyInverseDocumentFrequency(
  vector: Map<string, number>,
  documentFrequency: Map<string, number>,
  pageCount: number,
): Map<string, number> {
  const weighted = new Map<string, number>();

  for (const [token, value] of Array.from(vector.entries())) {
    const frequency = documentFrequency.get(token) ?? 0;
    const inverseDocumentFrequency = Math.log((pageCount + 1) / (frequency + 1)) + 1;
    weighted.set(token, value * inverseDocumentFrequency);
  }

  return weighted;
}

function cosineSimilarity(left: Map<string, number>, right: Map<string, number>): number {
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const value of Array.from(left.values())) {
    leftMagnitude += value * value;
  }

  for (const [token, value] of Array.from(right.entries())) {
    rightMagnitude += value * value;
    dotProduct += (left.get(token) ?? 0) * value;
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

export function buildDocumentIndex(pages: DocumentPage[]): DocumentIndex {
  const pageTokens = pages.map((page) => tokenize(page.text));
  const documentFrequency = buildDocumentFrequency(pageTokens);

  return {
    pages,
    documentFrequency,
    indexedPages: pages.map((page, index) => ({
      ...page,
      vector: applyInverseDocumentFrequency(
        termFrequency(pageTokens[index] ?? []),
        documentFrequency,
        pages.length,
      ),
    })),
  };
}

export function searchDocumentIndex(index: DocumentIndex, query: string): PageSearchResult | null {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return null;

  const queryVector = applyInverseDocumentFrequency(
    termFrequency(queryTokens),
    index.documentFrequency,
    index.pages.length,
  );

  const ranked = index.indexedPages
    .map((page) => ({
      ...page,
      score: cosineSimilarity(page.vector, queryVector),
      highlights: extractHighlights(page.text, queryTokens),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score ? ranked[0] : null;
}
