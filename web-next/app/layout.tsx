import 'react-datepicker/dist/react-datepicker.css';
import './globals.css';
import type { Metadata } from 'next';
import { I18nProvider } from '@/components/providers/i18n-provider';
import { AppFrame } from '@/components/shell/app-frame';

export const metadata: Metadata = {
  title: 'HertzBeat Workbench Next Pilot',
  description: 'Mixed Angular/Next.js observability workbench pilot for HertzBeat.',
  icons: {
    icon: '/assets/logo.svg',
    shortcut: '/assets/logo.svg'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body data-theme="dark-ops">
        <I18nProvider>
          <AppFrame>{children}</AppFrame>
        </I18nProvider>
      </body>
    </html>
  );
}
