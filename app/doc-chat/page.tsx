import type { Metadata } from 'next';
import DocChatTool from '@/components/DocChatTool';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Document Q&A',
  description: 'Upload a PDF and ask questions against local page-level document search.',
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
