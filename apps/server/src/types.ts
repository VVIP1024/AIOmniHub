export type Category =
  | 'AI Strategy'
  | 'Tech Trends'
  | 'Policy & Regulation'
  | 'Ethics & Governance'
  | 'Research'
  | 'Developer Forum'
  | 'Blog';

export type RssCategory = Category;

export interface FeedSource {
  name: string;
  url: string;
}

export interface CategoryInsight {
  category: Category;
  title: string;
  summary: string;
  link: string;
  source: string;
  publishedAt: string;
  image: string;
  readTime: string;
  tags?: string[];
}

export type HomepageInsights = Record<Category, CategoryInsight[]>;

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  tags: string[];
  summary: string;
  content: string;
  image: string;
  uploadedAt: string;
  readTime: string;
}

export interface BlogAsset {
  body: unknown;
  contentType: string;
}

export interface GitHubTrendsRequest {
  days: number;
  minStars: number;
  limit: number;
  industry: string;
}

export interface GitHubTrendsResponse<TRepository = unknown> {
  items: TRepository[];
}

export type AiChatRole = 'system' | 'user' | 'assistant';

export interface AiChatMessage {
  role: AiChatRole;
  content: string;
}

export interface AiChatRequest {
  prompt?: string;
  messages?: AiChatMessage[];
  model?: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AiChatResponse {
  text: string;
  provider: string;
  model: string;
  usage?: unknown;
  finishReason?: string;
}

export interface AiChatConfigResponse {
  provider: string;
  model: string;
  baseUrlConfigured: boolean;
  maxOutputTokens: number;
  temperature: number;
}

export interface BlobPutInput {
  pathname: string;
  content: string;
  contentType?: string;
}

export interface BlobPutResult {
  pathname: string;
  url: string;
}

export interface BlobDeleteResult {
  pathname: string;
  deleted: boolean;
}

export interface ServerRequest {
  method: string;
  url: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
}

export interface ServerResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ServerDependencies {
  config: {
    blobAdminToken?: string;
  };
  githubTrends: {
    fetch(input: GitHubTrendsRequest): Promise<GitHubTrendsResponse>;
  };
  aiChat: {
    getConfig(): AiChatConfigResponse;
    generate(input: AiChatRequest): Promise<AiChatResponse>;
  };
  blog: {
    getHomepageInsights(): Promise<HomepageInsights>;
    getPosts(): Promise<BlogPost[]>;
    getPost(slug: string): Promise<BlogPost | null>;
    getAsset(pathname: string): Promise<BlogAsset | null>;
  };
  blobAdmin: {
    put(input: BlobPutInput): Promise<BlobPutResult>;
    delete(pathname: string): Promise<BlobDeleteResult>;
  };
}
