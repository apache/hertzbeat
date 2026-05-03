import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformFactsStripComponent } from './platform-facts-strip.component';

describe('PlatformFactsStripComponent', () => {
  let fixture: ComponentFixture<PlatformFactsStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformFactsStripComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformFactsStripComponent);
    fixture.componentInstance.items = [
      { label: '全部告警组', value: '12' },
      { label: '告警中', value: '3', tone: 'critical' }
    ];
    fixture.detectChanges();
  });

  it('should render fact items and expose tone classes', () => {
    const root = fixture.nativeElement as HTMLElement;
    const items = root.querySelectorAll('.platform-facts-strip-item');

    expect(items.length).toBe(2);
    expect(root.textContent).toContain('全部告警组');
    expect(root.textContent).toContain('12');
    expect(root.querySelector('.platform-facts-strip-item--critical')).not.toBeNull();
  });
});
