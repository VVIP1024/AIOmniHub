# AIOmniHub · 全域人工智能枢纽门户

## 技术体系

Next.js + Tailwind CSS + Vercel Postgres + Vercel Blob
前端页面：Next.js
样式：Tailwind
配置存储：Vercel Edge Config
代码：GitHub
图片：Vercel Blob
部署：Vercel
代码：GitHub

## 项目结构

```plaintext
project-root/
├── apps/
│   ├── web/                # Next.js 应用（前端 + SSR）
│   │   ├── app/            # App Router
│   │   ├── components/     # UI组件（纯展示）
│   │   ├── features/       # 页面级功能模块（强烈推荐）
│   │   ├── hooks/
│   │   ├── services/       # 调用 BFF API（不写业务逻辑）
│   │   ├── styles/
│   │   └── utils/
│   │
│   └── server/             # Node BFF 层
│       ├── src/
│       │   ├── controllers/   # HTTP入口（参数校验 + DTO）
│       │   ├── application/   # 用例层（协调逻辑）
│       │   ├── domain/        # 核心业务逻辑（最重要）
│       │   │   ├── entities/
│       │   │   ├── services/
│       │   │   ├── repositories/
│       │   │
│       │   ├── infrastructure/ # DB / 外部服务实现
│       │   │   ├── db/
│       │   │   ├── cache/
│       │   │   ├── http/
│       │   │
│       │   ├── middleware/
│       │   ├── config/
│       │   └── index.ts
│
├── packages/
│   ├── shared/             # 前后端共享（类型、工具）
│   │   ├── types/
│   │   ├── constants/
│   │   └── utils/
│   │
│   ├── ui/                 # 可复用组件库（可选）
│   ├── sdk/                # API SDK（封装 fetch）
│
├── configs/
├── scripts/
├── .env
└── package.json
```
