import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzIconsTesting } from 'ng-zorro-antd/icon/testing';

import { PlatformDrawerActionLinksComponent } from './platform-drawer-action-links.component';

describe('PlatformDrawerActionLinksComponent', () => {
  let fixture: ComponentFixture<PlatformDrawerActionLinksComponent>;
  let component: PlatformDrawerActionLinksComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformDrawerActionLinksComponent],
      providers: [provideNzIconsTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformDrawerActionLinksComponent);
    component = fixture.componentInstance;
  });

  it('should emit selected action keys', () => {
    spyOn(component.actionSelected, 'emit');
    component.items = [{ key: 'logs', label: '查看日志', icon: 'file-search' }];
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();

    expect(component.actionSelected.emit).toHaveBeenCalledWith('logs');
  });
});
