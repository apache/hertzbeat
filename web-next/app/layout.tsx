import 'react-datepicker/dist/react-datepicker.css';
import './globals.css';
import type { Metadata } from 'next';
import { I18nProvider } from '@/components/providers/i18n-provider';
import { HertzBeatQueryProvider } from '@/components/providers/query-provider';
import { AppFrame } from '@/components/shell/app-frame';

export const metadata: Metadata = {
  title: 'HertzBeat Observability Workbench',
  description: 'Private-deployable operations observability for monitors, OTLP signals, alerts, topology, and safe automation.',
  icons: {
    icon: '/assets/logo.svg',
    shortcut: '/assets/logo.svg'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body data-theme="dark-ops">
        <HertzBeatQueryProvider>
          <I18nProvider>
            <AppFrame>{children}</AppFrame>
          </I18nProvider>
        </HertzBeatQueryProvider>
      </body>
    </html>
  );
}
