'use client';

import React, { useEffect, useRef, useState } from 'react';
import { translateAlertIntegration } from '../../lib/alert-integration/view-model';

type MermaidRenderResult = {
  svg: string;
  bindFunctions?: (element: Element) => void;
};

type MermaidModule = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<MermaidRenderResult>;
};

let mermaidModulePromise: Promise<MermaidModule> | null = null;
let mermaidInitialized = false;
let renderSequence = 0;

async function loadMermaid() {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then(module => module.default as MermaidModule);
  }

  return mermaidModulePromise;
}

function initializeMermaid(mermaid: MermaidModule) {
  if (mermaidInitialized) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'strict',
    fontFamily: "Inter, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    themeVariables: {
      background: '#101217',
      mainBkg: '#151d2b',
      primaryColor: '#151d2b',
      primaryTextColor: '#eef2f7',
      primaryBorderColor: '#31405c',
      lineColor: '#8f98aa',
      textColor: '#eef2f7',
      clusterBkg: '#101217',
      clusterBorder: '#303743',
      edgeLabelBackground: '#101217'
    }
  });
  mermaidInitialized = true;
}

export function AlertIntegrationMermaid({ source }: { source: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'pending' | 'rendered' | 'error'>('pending');

  useEffect(() => {
    let active = true;

    async function renderDiagram() {
      const target = containerRef.current;
      if (!target) {
        return;
      }

      target.innerHTML = '';
      setStatus('pending');

      try {
        const mermaid = await loadMermaid();
        initializeMermaid(mermaid);
        const result = await mermaid.render(`alert-integration-mermaid-${++renderSequence}`, source.trim());

        if (!active || !containerRef.current) {
          return;
        }

        containerRef.current.innerHTML = result.svg;
        result.bindFunctions?.(containerRef.current);
        setStatus('rendered');
      } catch {
        if (!active) {
          return;
        }
        setStatus('error');
      }
    }

    void renderDiagram();

    return () => {
      active = false;
    };
  }, [source]);

  return (
    <figure
      data-alert-integration-mermaid={status}
      className="my-3 mb-4 overflow-hidden rounded-[4px] border border-[#303743] bg-[#101217] p-4"
    >
      <div
        ref={containerRef}
        data-alert-integration-mermaid-canvas="svg-host"
        className="min-h-[180px] overflow-auto [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-full"
        aria-label={translateAlertIntegration('alert.integration.diagram.aria')}
      />
      {status === 'pending' ? (
        <div className="mt-2 text-center text-[12px] text-[#858d9a]">
          {translateAlertIntegration('alert.integration.diagram.pending')}
        </div>
      ) : null}
      {status === 'error' ? (
        <div className="text-center text-[12px] text-[#f59f9f]">
          {translateAlertIntegration('alert.integration.diagram.error')}
        </div>
      ) : null}
    </figure>
  );
}
