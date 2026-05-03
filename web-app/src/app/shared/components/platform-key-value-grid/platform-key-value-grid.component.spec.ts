import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformKeyValueGridComponent } from './platform-key-value-grid.component';

describe('PlatformKeyValueGridComponent', () => {
  let fixture: ComponentFixture<PlatformKeyValueGridComponent>;
  let component: PlatformKeyValueGridComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformKeyValueGridComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformKeyValueGridComponent);
    component = fixture.componentInstance;
  });

  it('should render key value items with compact mode', () => {
    component.compact = true;
    component.items = [
      { label: '负责人', value: '未分配' },
      { label: '系统', value: 'commerce' }
    ];
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('.platform-key-value-grid--compact')).not.toBeNull();
    expect(host.textContent).toContain('负责人');
    expect(host.textContent).toContain('commerce');
  });
});
