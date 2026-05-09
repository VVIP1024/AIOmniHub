import { generateAiChat, getAiChatConfig } from './application/ai-chat.js';
import { deleteBlob, putBlob } from './application/blob-admin.js';
import { getBlogAsset, getBlogPost, getBlogPosts, getHomepageInsights } from './application/blog.js';
import { fetchGitHubTrends } from './application/github-trends.js';
import type { ServerDependencies } from './types.js';

export function createServerDependencies(): ServerDependencies {
  return {
    config: {
      blobAdminToken: process.env.BLOB_ADMIN_TOKEN,
    },
    githubTrends: {
      fetch: fetchGitHubTrends,
    },
    aiChat: {
      getConfig: getAiChatConfig,
      generate: generateAiChat,
    },
    blog: {
      getHomepageInsights,
      getPosts: getBlogPosts,
      getPost: getBlogPost,
      getAsset: getBlogAsset,
    },
    blobAdmin: {
      put: putBlob,
      delete: deleteBlob,
    },
  };
}
