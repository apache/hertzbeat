import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CONSTANTS } from '../../constants';

import { PlatformCopyrightFooterComponent } from './platform-copyright-footer.component';

describe('PlatformCopyrightFooterComponent', () => {
  let fixture: ComponentFixture<PlatformCopyrightFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformCopyrightFooterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformCopyrightFooterComponent);
    fixture.detectChanges();
  });

  it('should render default version and copyright copy', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain(`Apache HertzBeat™ ${CONSTANTS.VERSION}`);
    expect(root.textContent).toContain('Licensed under the Apache License, Version 2.0');
  });
});
