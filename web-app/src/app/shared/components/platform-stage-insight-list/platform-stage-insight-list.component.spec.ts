import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformStageInsightItem, PlatformStageInsightListComponent } from './platform-stage-insight-list.component';

describe('PlatformStageInsightListComponent', () => {
  let fixture: ComponentFixture<PlatformStageInsightListComponent>;
  let component: PlatformStageInsightListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformStageInsightListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformStageInsightListComponent);
    component = fixture.componentInstance;
  });

  it('should render insight items in a vertical stage list', () => {
    component.items = [
      { label: '当前时间窗', value: '12 条链路' },
      { label: '错误链路', value: '1 / 12' }
    ] satisfies PlatformStageInsightItem[];
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const items = root.querySelectorAll('.platform-stage-insight-list-item');

    expect(items.length).toBe(2);
    expect(root.textContent).toContain('当前时间窗');
    expect(root.textContent).toContain('12 条链路');
    expect(root.textContent).toContain('错误链路');
  });
});
