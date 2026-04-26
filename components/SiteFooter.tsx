type FooterVariant = 'home' | 'details';

interface SiteFooterProps {
  variant: FooterVariant;
}

export default function SiteFooter({ variant }: SiteFooterProps) {
  if (variant === 'details') {
    return (
      <footer className="bg-slate-50 dark:bg-slate-900 font-sans text-sm tracking-tight full-width py-12 mt-auto border-t border-slate-200 dark:border-slate-800 flat no shadows">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto px-8 w-full gap-4">
          <div className="font-serif italic font-semibold text-lg text-slate-900 dark:text-slate-50">
            ConsultAI
          </div>
          <div className="text-slate-500 dark:text-slate-400">
            © 2024 ConsultAI Platform. Focused intelligence for the modern era.
          </div>
          <div className="flex gap-6">
            <a
              className="text-slate-500 dark:text-slate-400 hover:underline decoration-slate-300 underline-offset-4 transition-all duration-300"
              href="#"
            >
              Privacy
            </a>
            <a
              className="text-slate-500 dark:text-slate-400 hover:underline decoration-slate-300 underline-offset-4 transition-all duration-300"
              href="#"
            >
              Terms
            </a>
            <a
              className="text-slate-500 dark:text-slate-400 hover:underline decoration-slate-300 underline-offset-4 transition-all duration-300"
              href="#"
            >
              Archive
            </a>
            <a
              className="text-slate-500 dark:text-slate-400 hover:underline decoration-slate-300 underline-offset-4 transition-all duration-300"
              href="#"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans manrope text-sm full-width border-t mt-20 border-t border-slate-200 dark:border-slate-800 flat no shadows Transition-all duration-300">
      <div className="max-w-7xl mx-auto px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="font-serif italic text-lg text-slate-900 dark:text-slate-50">Intellect &amp; Insight</div>
        <nav className="flex flex-wrap justify-center gap-6">
          <a
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline transition-colors"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline transition-colors"
            href="#"
          >
            Terms of Service
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline transition-colors"
            href="#"
          >
            Expert Network
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline transition-colors"
            href="#"
          >
            Contact
          </a>
        </nav>
        <div className="text-slate-500 dark:text-slate-400 text-xs">
          © 2024 Intellect &amp; Insight AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
