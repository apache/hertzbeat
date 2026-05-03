import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzIconsTesting } from 'ng-zorro-antd/icon/testing';

import { PlatformSummaryMetricGridComponent } from './platform-summary-metric-grid.component';

describe('PlatformSummaryMetricGridComponent', () => {
  let fixture: ComponentFixture<PlatformSummaryMetricGridComponent>;
  let component: PlatformSummaryMetricGridComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformSummaryMetricGridComponent],
      providers: [provideNzIconsTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformSummaryMetricGridComponent);
    component = fixture.componentInstance;
    component.items = [
      { label: '总数', value: '12', icon: 'file-text', actionLabel: '打开', actionKey: 'total' },
      { label: '错误', value: '3', icon: 'warning', tone: 'critical' }
    ];
    fixture.detectChanges();
  });

  it('should render summary metric items', () => {
    const items = fixture.nativeElement.querySelectorAll('.platform-summary-metric-grid-item');
    expect(items.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('总数');
    expect(fixture.nativeElement.textContent).toContain('错误');
  });

  it('should render metric actions and emit the selected action key', () => {
    const selected = jasmine.createSpy('selected');
    component.itemActionSelected.subscribe(selected);

    const actionButton = fixture.nativeElement.querySelector('.platform-summary-metric-grid-action');
    expect(actionButton?.textContent).toContain('打开');

    actionButton.click();

    expect(selected).toHaveBeenCalledWith('total');
  });
});
