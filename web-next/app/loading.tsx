import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <main
      data-app-route-loading="global-workbench-loading"
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="min-h-[calc(100vh-56px)] bg-[#07090b] px-6 py-6 text-[#e8edf5]"
    >
      <section className="mx-auto flex min-h-[360px] w-full max-w-[1600px] items-center justify-center rounded-[4px] border border-[#252b35] bg-[#0d1015] px-6 py-12 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <div className="flex max-w-[420px] flex-col items-center text-center">
          <Loader2
            data-app-route-loading-spinner="true"
            className="h-8 w-8 animate-spin text-[#8fb3ff]"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-[18px] font-semibold tracking-normal text-[#f4f7fb]">正在加载工作台</h1>
          <p className="mt-2 text-[13px] leading-6 text-[#9ca7ba]">
            正在准备页面数据，请稍等。
          </p>
        </div>
      </section>
    </main>
  );
}
