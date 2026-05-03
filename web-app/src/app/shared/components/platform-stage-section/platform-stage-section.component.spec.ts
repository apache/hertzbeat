import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformStageSectionComponent } from './platform-stage-section.component';

@Component({
  standalone: true,
  imports: [PlatformStageSectionComponent],
  template: `
    <app-platform-stage-section kicker="Stage" title="Main stage" description="Shared section">
      <button stageHeaderActions type="button">Action</button>
      <div class="stage-body">Body</div>
    </app-platform-stage-section>
  `
})
class TestHostComponent {}

describe('PlatformStageSectionComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should render header copy, actions and projected body', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.platform-stage-section-kicker')?.textContent).toContain('Stage');
    expect(root.querySelector('.platform-stage-section-title')?.textContent).toContain('Main stage');
    expect(root.querySelector('.platform-stage-section-description')?.textContent).toContain('Shared section');
    expect(root.querySelector('.platform-stage-section-actions button')?.textContent).toContain('Action');
    expect(root.querySelector('.stage-body')?.textContent).toContain('Body');
  });
});
