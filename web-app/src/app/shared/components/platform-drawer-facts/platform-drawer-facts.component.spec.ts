import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformDrawerFactsComponent } from './platform-drawer-facts.component';

describe('PlatformDrawerFactsComponent', () => {
  let fixture: ComponentFixture<PlatformDrawerFactsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformDrawerFactsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformDrawerFactsComponent);
    fixture.componentInstance.items = [
      { label: '严重级别', value: 'ERROR', tagColor: 'red' },
      { label: 'traceId', value: 'trace-1', monospace: true }
    ];
    fixture.detectChanges();
  });

  it('should render tag and monospace facts', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('.platform-drawer-fact-card').length).toBe(2);
    expect(root.querySelector('nz-tag')).not.toBeNull();
    expect(root.querySelector('.platform-drawer-fact-value.is-monospace')?.textContent).toContain('trace-1');
  });
});
