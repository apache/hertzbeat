import { AfterViewInit, Directive, ElementRef, Inject, InjectionToken, NgZone, OnDestroy, Optional } from '@angular/core';

const MERMAID_SELECTOR = 'pre > code.language-mermaid, pre > code[class~="language-mermaid"]';

type MermaidModule = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<MarkdownMermaidRenderResult>;
};

let mermaidModulePromise: Promise<MermaidModule> | null = null;

export interface MarkdownMermaidRenderResult {
  svg: string;
  bindFunctions?: (element: Element) => void;
}

export interface MarkdownMermaidRenderer {
  render(id: string, source: string, theme: 'dark' | 'default'): Promise<MarkdownMermaidRenderResult>;
}

export const MARKDOWN_MERMAID_RENDERER = new InjectionToken<MarkdownMermaidRenderer>('MARKDOWN_MERMAID_RENDERER');

@Directive({
  selector: '[appMarkdownMermaid]',
  standalone: true
})
export class MarkdownMermaidDirective implements AfterViewInit, OnDestroy {
  private static initializedTheme: string | null = null;

  private observer?: MutationObserver;
  private renderQueued = false;
  private renderSequence = 0;
  private destroyed = false;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly ngZone: NgZone,
    @Optional() @Inject(MARKDOWN_MERMAID_RENDERER) private readonly renderer: MarkdownMermaidRenderer | null
  ) {}

  ngAfterViewInit(): void {
    this.observeMarkdownMutations();
    this.queueRender();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
  }

  private observeMarkdownMutations(): void {
    this.ngZone.runOutsideAngular(() => {
      this.observer = new MutationObserver(() => this.queueRender());
      this.observer.observe(this.elementRef.nativeElement, {
        childList: true,
        subtree: true
      });
    });
  }

  private queueRender(): void {
    if (this.renderQueued || this.destroyed) {
      return;
    }
    this.renderQueued = true;
    this.ngZone.runOutsideAngular(() => {
      queueMicrotask(async () => {
        this.renderQueued = false;
        await this.renderPendingBlocks();
      });
    });
  }

  private async renderPendingBlocks(): Promise<void> {
    const blocks = Array.from(this.elementRef.nativeElement.querySelectorAll<HTMLElement>(MERMAID_SELECTOR)).filter(
      block => block.dataset['mermaidProcessed'] !== 'true'
    );

    for (const block of blocks) {
      block.dataset['mermaidProcessed'] = 'true';
      await this.renderBlock(block);
    }
  }

  private async renderBlock(block: HTMLElement): Promise<void> {
    const source = block.textContent?.trim();
    const pre = block.closest('pre');
    if (!source || !pre || this.destroyed) {
      return;
    }

    const theme = this.resolveTheme();

    const diagram = document.createElement('div');
    diagram.className = 'markdown-mermaid-diagram';

    try {
      const renderResult = await this.renderMermaid(`markdown-mermaid-${++this.renderSequence}`, source, theme);
      if (this.destroyed) {
        return;
      }
      diagram.innerHTML = renderResult.svg;
      pre.replaceWith(diagram);
      renderResult.bindFunctions?.(diagram);
    } catch {
      diagram.classList.add('markdown-mermaid-diagram--error');
      const fallback = document.createElement('pre');
      fallback.textContent = source;
      diagram.appendChild(fallback);
      pre.replaceWith(diagram);
    }
  }

  private async renderMermaid(id: string, source: string, theme: 'dark' | 'default'): Promise<MarkdownMermaidRenderResult> {
    if (this.renderer) {
      return this.renderer.render(id, source, theme);
    }

    const mermaid = await this.loadMermaid();
    this.ensureMermaidInitialized(mermaid, theme);
    return mermaid.render(id, source);
  }

  private ensureMermaidInitialized(mermaid: MermaidModule, theme: 'dark' | 'default'): void {
    if (MarkdownMermaidDirective.initializedTheme === theme) {
      return;
    }

    mermaid.initialize({
      startOnLoad: false,
      theme,
      securityLevel: 'strict',
      fontFamily: "Inter, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    });
    MarkdownMermaidDirective.initializedTheme = theme;
  }

  private loadMermaid(): Promise<MermaidModule> {
    if (!mermaidModulePromise) {
      mermaidModulePromise = import('mermaid/dist/mermaid.esm.min.mjs').then(module => module.default as MermaidModule);
    }
    return mermaidModulePromise;
  }

  private resolveTheme(): 'dark' | 'default' {
    const bodyTheme = document.body?.dataset['theme'];
    if (bodyTheme === 'light-ops' || bodyTheme === 'default' || bodyTheme === 'compact') {
      return 'default';
    }
    return 'dark';
  }
}
