import React from 'react';

export default function TopologyRouteShell() {
  return (
    <main
      className="min-h-[calc(100vh-56px)] bg-[#08090c] px-4 py-6 text-[#f1f3f7]"
      data-topology-route-shell="deferred-client-entry"
      data-topology-route-shell-owner="next-dynamic-client-entry"
    >
      <section className="mx-auto flex max-w-[1440px] flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="h-3 w-14 rounded-[2px] bg-[#1b2230]" />
            <div className="mt-3 h-6 w-28 rounded-[3px] bg-[#202838]" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-14 rounded-[3px] bg-[#121722]" />
            <div className="h-8 w-20 rounded-[3px] bg-[#121722]" />
          </div>
        </div>
        <div className="h-10 rounded-[3px] border border-[#1e2634] bg-[#0c1119]" />
        <div className="h-[640px] rounded-[3px] border border-[#1e2634] bg-[#07090d]" />
      </section>
    </main>
  );
}
