import type { Metadata } from 'next';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import DocChatTool from '@/features/doc-chat/DocChatTool';

export const metadata: Metadata = {
  title: '文档智问 | AI Omni Hub',
  description: '上传 PDF，围绕文档内容提问并定位答案所在页面。',
};

export default function DocChatPage() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <SiteHeader variant="home" />
      <main className="flex-grow">
        <DocChatTool />
      </main>
      <SiteFooter variant="home" />
    </div>
  );
}
