import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { ALAIN_I18N_TOKEN, SettingsService } from '@delon/theme';
import { RouterTestingModule } from '@angular/router/testing';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { Subject } from 'rxjs';

import { AiChatModalService } from '../../shared/services/ai-chat-modal.service';
import { OpsWorkspaceFacade } from '../../core/ops-workspace/ops-workspace.facade';
import { LayoutBasicComponent } from './basic.component';

@Pipe({ name: 'i18n', standalone: false })
class MockI18nPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

class MockRouter {
  url = '/overview';
  readonly events = new Subject<NavigationEnd>();

  createUrlTree(): { toString: () => string } {
    return {
      toString: () => this.url
    };
  }

  serializeUrl(url: { toString?: () => string } | string): string {
    if (typeof url === 'string') {
      return url;
    }
    return url?.toString?.() ?? this.url;
  }
}

class MockSettingsService {
  user = { role: '["admin"]' };
  setLayout = jasmine.createSpy('setLayout');
}

class MockI18nService {
  fanyi(key: string): string {
    return key;
  }
}

class MockAiChatModalService {
  openChatModal(): void {}
}

class MockOpsWorkspaceFacade {
  drawer(): null {
    return null;
  }

  closeDrawer(): void {}
}

describe('LayoutBasicComponent', () => {
  let router: MockRouter;
  let settings: MockSettingsService;
  let component: LayoutBasicComponent;
  let fixture: ComponentFixture<LayoutBasicComponent>;

  function setViewport(width: number): void {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width
    });
  }

  function createComponent(): LayoutBasicComponent {
    router = new MockRouter();
    settings = new MockSettingsService();
    component = new LayoutBasicComponent(
      settings as any,
      new MockI18nService() as any,
      new MockAiChatModalService() as any,
      router as any,
      new MockOpsWorkspaceFacade() as any
    );
    return component;
  }

  async function createFixture(url = '/overview'): Promise<ComponentFixture<LayoutBasicComponent>> {
    router = new MockRouter();
    router.url = url;
    settings = new MockSettingsService();

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, NzDropDownModule],
      declarations: [LayoutBasicComponent, MockI18nPipe],
      providers: [
        { provide: ALAIN_I18N_TOKEN, useClass: MockI18nService },
        { provide: ActivatedRoute, useValue: {} },
        { provide: SettingsService, useValue: settings },
        { provide: Router, useValue: router },
        { provide: AiChatModalService, useClass: MockAiChatModalService },
        { provide: OpsWorkspaceFacade, useClass: MockOpsWorkspaceFacade }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutBasicComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should use the legacy tree nav for desktop layouts', () => {
    setViewport(1280);

    const instance = createComponent();
    instance.ngOnInit();

    expect((instance as any).usesDefaultTreeNav).toBeTrue();
    expect((instance as any).showHeaderSetupGuide).toBeTrue();
    expect(settings.setLayout).toHaveBeenCalledWith('collapsed', false);
  });

  it('should keep mobile layouts on the compact navigation mode', () => {
    setViewport(480);

    const instance = createComponent();
    instance.ngOnInit();

    expect((instance as any).usesDefaultTreeNav).toBeFalse();
    expect((instance as any).showHeaderSetupGuide).toBeFalse();
  });

  it('should keep ops workspace mode enabled for observability routes', () => {
    setViewport(1280);

    const instance = createComponent();
    router.url = '/topology';
    instance.ngOnInit();

    expect(instance.isOpsWorkspace).toBeTrue();
  });

  it('should render a global footer fallback for ops routes', async () => {
    const opsFixture = await createFixture('/alert/notice');
    expect(opsFixture.componentInstance.isOpsWorkspace).toBeTrue();
  });
});
