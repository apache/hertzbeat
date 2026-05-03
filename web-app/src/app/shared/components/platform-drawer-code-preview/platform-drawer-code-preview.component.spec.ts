import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedModule } from '../../shared.module';

@Component({
  standalone: false,
  template: `
    <app-platform-drawer-code-preview
      [code]="code"
      language="json"
      title="完整 JSON 数据"
      maxHeight="320px"
    ></app-platform-drawer-code-preview>
  `
})
class HostComponent {
  code = '{\n  "traceId": "trace-123"\n}';
}

describe('PlatformDrawerCodePreviewComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      declarations: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should render a drawer-scoped code preview with the provided title and language', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.platform-drawer-code-preview')).not.toBeNull();
    expect(root.textContent).toContain('完整 JSON 数据');
    expect(root.textContent).toContain('JSON');
  });
});
