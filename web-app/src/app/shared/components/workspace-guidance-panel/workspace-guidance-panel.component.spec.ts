import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedModule } from '../../shared.module';
import { WorkspaceGuidancePanelComponent } from './workspace-guidance-panel.component';

describe('WorkspaceGuidancePanelComponent', () => {
  let fixture: ComponentFixture<WorkspaceGuidancePanelComponent>;
  let component: WorkspaceGuidancePanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedModule]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceGuidancePanelComponent);
    component = fixture.componentInstance;
  });

  it('should expose shared fact items and support link items', () => {
    component.reasons = [
      { label: '当前对象', value: 'Checkout Service' },
      { label: '已启用筛选', value: '2' }
    ];
    component.nextLinks = [
      { key: 'logs', label: '查看日志', description: '继续核对相关日志。' },
      { key: 'code', label: '打开代码定位', disabled: true }
    ];

    expect(component.reasonFacts).toEqual([
      { label: '当前对象', value: 'Checkout Service' },
      { label: '已启用筛选', value: '2' }
    ]);
    expect(component.nextLinkItems).toEqual([
      { key: 'logs', label: '查看日志', description: '继续核对相关日志。' },
      { key: 'code', label: '打开代码定位', disabled: true }
    ]);
  });

  it('should emit selected link keys through the shared support link list', () => {
    component.nextLinks = [{ key: 'logs', label: '查看日志' }];
    fixture.detectChanges();

    const emitted: string[] = [];
    component.nextSelected.subscribe((key: string) => emitted.push(key));

    const button = fixture.nativeElement.querySelector('.platform-support-link-list-item') as HTMLButtonElement;
    button.click();

    expect(emitted).toEqual(['logs']);
  });

  it('should render inside the shared platform support panel shell', () => {
    component.headline = '下一步：查看日志';
    component.description = '先检查当前上下文中的日志。';
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.platform-support-panel')).not.toBeNull();
    expect(root.textContent).toContain('下一步：查看日志');
  });
});
