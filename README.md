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

## Vercel Blob Store 操作说明

本项目通过 BFF 接口操作 Vercel Blob。`apps/web/app/api/blob/route.ts` 是 Vercel Function 入口，实际业务逻辑在 `apps/server/src/application/blob-admin.ts`。

### 环境变量

生产环境需要在 Vercel Project 的 Environment Variables 中配置：

```bash
BLOB_ADMIN_TOKEN=your-admin-token
BLOB_READ_WRITE_TOKEN=vercel-blob-token
```

`BLOB_ADMIN_TOKEN` 用于保护新增和删除接口；请求必须带：

```http
Authorization: Bearer your-admin-token
```

`BLOB_READ_WRITE_TOKEN` 由 Vercel Blob Store 提供，用于 `@vercel/blob` 访问 Blob Store。

### 新增或覆盖 Blob

接口：

```http
POST /api/blob
```

请求体：

```json
{
  "pathname": "Blog/测试文档.md",
  "content": "---\ntitle: \"测试文档\"\ndescription: \"示例文章\"\nkeywords:\n  - AI\ntags:\n  - Demo\n---\n\n正文内容",
  "contentType": "text/markdown; charset=utf-8"
}
```

示例：

```bash
curl -X POST "https://your-domain.com/api/blob" \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "pathname": "Blog/测试文档.md",
    "content": "---\ntitle: \"测试文档\"\ndescription: \"示例文章\"\nkeywords:\n  - AI\ntags:\n  - Demo\n---\n\n正文内容",
    "contentType": "text/markdown; charset=utf-8"
  }'
```

返回：

```json
{
  "pathname": "Blog/测试文档.md",
  "url": "https://..."
}
```

当前接口适合上传 Markdown、JSON、纯文本等字符串内容。图片或任意二进制文件需要再扩展 multipart/base64 上传接口。

### 删除 Blob

接口：

```http
DELETE /api/blob
```

请求体：

```json
{
  "pathname": "Blog/测试文档.md"
}
```

示例：

```bash
curl -X DELETE "https://your-domain.com/api/blob" \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "pathname": "Blog/测试文档.md"
  }'
```

返回：

```json
{
  "pathname": "Blog/测试文档.md",
  "deleted": true
}
```

### 文件夹说明

Vercel Blob Store 没有真实的“创建文件夹”操作。所谓文件夹只是 Blob pathname 的前缀。

例如直接上传：

```json
{
  "pathname": "Blog/images/test.png",
  "content": "text-demo",
  "contentType": "text/plain"
}
```

Blob Store 会显示为 `Blog/images/test.png`，不需要提前创建 `Blog` 或 `images` 文件夹。

### 路径规则

接口会清理路径中的空段、`.` 和 `..`，避免写入异常路径：

```text
Blog/../secret.md -> Blog/secret.md
Blog//demo.md -> Blog/demo.md
```

建议约定：

```text
Blog/<文章 slug>.md
Blog/images/<图片名>
```

### 常见错误

- `401 Unauthorized`：缺少 `Authorization` 头，或 token 与 `BLOB_ADMIN_TOKEN` 不一致。
- `400 Invalid blob payload`：请求体缺少 `pathname`，或新增时缺少字符串类型的 `content`。
- `502 Invalid blob pathname`：清理后的 pathname 为空，或 Vercel Blob 操作失败。
- 上传图片失败：当前 JSON 接口只支持字符串内容，图片/文件上传需要扩展二进制上传接口。
