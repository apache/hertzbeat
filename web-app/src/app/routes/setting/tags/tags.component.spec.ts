import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingTagsComponent } from './tags.component';

describe('SettingTagsComponent', () => {
  let component: SettingTagsComponent;
  let fixture: ComponentFixture<SettingTagsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [SettingTagsComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingTagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
