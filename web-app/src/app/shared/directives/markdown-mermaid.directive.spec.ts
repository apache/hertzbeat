import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MARKDOWN_MERMAID_RENDERER, MarkdownMermaidDirective, MarkdownMermaidRenderer } from './markdown-mermaid.directive';

@Component({
  standalone: true,
  imports: [MarkdownMermaidDirective],
  template: `
    <div class="markdown-host" appMarkdownMermaid [innerHTML]="content"></div>
  `
})
class HostComponent {
  content = '<pre><code class="language-mermaid">graph LR\nA-->B</code></pre>';
}

describe('MarkdownMermaidDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let renderer: jasmine.SpyObj<MarkdownMermaidRenderer>;

  beforeEach(async () => {
    renderer = jasmine.createSpyObj<MarkdownMermaidRenderer>('MarkdownMermaidRenderer', ['render']);
    renderer.render.and.resolveTo({
      svg: '<svg class="mock-mermaid"><text>diagram</text></svg>'
    });

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: MARKDOWN_MERMAID_RENDERER, useValue: renderer }]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  });

  it('should replace mermaid code blocks with rendered diagram containers', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('pre code.language-mermaid')).toBeNull();
    expect(root.querySelector('.markdown-mermaid-diagram svg')).not.toBeNull();
    expect(renderer.render).toHaveBeenCalled();
  });
});
