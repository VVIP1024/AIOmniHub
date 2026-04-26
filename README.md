# AIOmniHub · 全域人工智能枢纽门户

## 技术体系

Next.js + Tailwind CSS + Vercel Postgres + Vercel Blob
前端页面：Next.js
样式：Tailwind（AI 最会写）
配置存储：Vercel Edge Config
代码：GitHub
图片：Vercel Blob
部署：Vercel（push 代码即更新）
代码：GitHub

## 项目结构

```plaintext
app/
├── layout.tsx # 全局布局
├── page.tsx # 首页（聚合所有资讯）
├── globals.css # 样式
lib/
├── rss.ts # RSS 抓取核心逻辑
package.json
next.config.js
tsconfig.json
tailwind.config.js
```
