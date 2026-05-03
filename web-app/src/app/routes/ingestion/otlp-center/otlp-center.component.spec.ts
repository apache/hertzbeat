/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { convertToParamMap } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { of } from 'rxjs';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { Message } from '../../../pojo/Message';
import { OtlpEntityBindingSummary, OtlpIngestionGuide, OtlpIngestionOverview } from '../../../pojo/OtlpIngestion';
import { AuthService } from '../../../service/auth.service';
import { OtlpIngestionService } from '../../../service/otlp-ingestion.service';
import { OtlpCenterComponent } from './otlp-center.component';

describe('OtlpCenterComponent', () => {
  function successMessage<T>(data: T): Message<T> {
    const message = new Message<T>();
    message.code = 0;
    message.msg = '';
    message.data = data;
    return message;
  }

  function createGuide(): OtlpIngestionGuide {
    const guide = new OtlpIngestionGuide();
    guide.httpProtocolLabel = 'OTLP HTTP';
    guide.grpcProtocolLabel = 'OTLP gRPC';
    guide.authHeaderName = 'Authorization';
    guide.authHeaderExample = 'Bearer <api-token>';
    guide.signals = [
      { signal: 'metrics', protocol: 'http', endpoint: 'http-metrics', mode: 'OTLP HTTP' },
      { signal: 'logs', protocol: 'http', endpoint: 'http-logs', mode: 'OTLP HTTP' },
      { signal: 'traces', protocol: 'http', endpoint: 'http-traces', mode: 'OTLP HTTP' },
      { signal: 'metrics', protocol: 'grpc', endpoint: 'grpc-metrics', mode: 'OTLP gRPC' },
      { signal: 'logs', protocol: 'grpc', endpoint: 'grpc-logs', mode: 'OTLP gRPC' },
      { signal: 'traces', protocol: 'grpc', endpoint: 'grpc-traces', mode: 'OTLP gRPC' }
    ];
    guide.snippets = [
      {
        key: 'collector-http',
        protocol: 'http',
        title: 'Collector',
        language: 'yaml',
        content: 'endpoint: "http://127.0.0.1:1157/api/otlp"'
      },
      {
        key: 'collector-grpc',
        protocol: 'grpc',
        title: 'Collector',
        language: 'yaml',
        content: 'endpoint: "grpc://127.0.0.1:1157"'
      }
    ];
    return guide;
  }

  function createBindingSummary(): OtlpEntityBindingSummary {
    return {
      canonicalIdentityKeys: ['service.name', 'deployment.environment'],
      recentServices: ['checkout'],
      recentIdentitySamples: [],
      recentBoundEntities: []
    } as OtlpEntityBindingSummary;
  }

  function createComponent(signal?: string): OtlpCenterComponent {
    const otlpIngestionSvc = jasmine.createSpyObj('OtlpIngestionService', ['getOverview', 'getGuide', 'getBindings']);
    const authSvc = jasmine.createSpyObj('AuthService', ['generateToken']);
    const route = {
      snapshot: {
        queryParamMap: convertToParamMap(signal ? { signal } : {})
      }
    };
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const notification = jasmine.createSpyObj('NzNotificationService', ['success', 'warning']);
    const i18n = { fanyi: (key: string) => key };

    otlpIngestionSvc.getOverview.and.returnValue(of(successMessage(new OtlpIngestionOverview())));
    otlpIngestionSvc.getGuide.and.returnValue(of(successMessage(createGuide())));
    otlpIngestionSvc.getBindings.and.returnValue(of(successMessage(createBindingSummary())));

    return new (OtlpCenterComponent as any)(otlpIngestionSvc, authSvc, route, router, notification, i18n);
  }

  function getLuminance(color: string): number {
    const matched = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!matched) {
      return 0;
    }
    const [, r, g, b] = matched;
    return 0.2126 * Number(r) + 0.7152 * Number(g) + 0.0722 * Number(b);
  }

  it('should keep default signal order when no signal query is provided', () => {
    const component = createComponent();

    component.ngOnInit();

    expect(component.signalCards.map(item => item.signal)).toEqual(['metrics', 'logs', 'traces']);
    expect(component.signalGuides.map(item => item.signal)).toEqual(['metrics', 'logs', 'traces']);
  });

  it('should prioritize the requested signal from query params', () => {
    const component = createComponent('logs');

    component.ngOnInit();

    expect((component as any).preferredSignal).toBe('logs');
    expect(component.signalCards.map(item => item.signal)).toEqual(['logs', 'metrics', 'traces']);
    expect(component.signalGuides.map(item => item.signal)).toEqual(['logs', 'metrics', 'traces']);
  });

  it('should expose onboarding console copy and recent service summary after loading', () => {
    const component = createComponent();
    component.bindingSummary = {
      canonicalIdentityKeys: [],
      recentServices: ['checkout', 'billing'],
      recentIdentitySamples: [],
      recentBoundEntities: []
    };
    component.overview.activeSignalCount = 2;

    expect(component.onboardingConsoleTitle).toBe('ingestion.otlp.console.title.active');
    expect(component.onboardingConsoleCopy).toBe('ingestion.otlp.console.copy.active');
    expect(component.recentServiceCount).toBe(2);
  });

  it('should ignore unsupported signal query params', () => {
    const component = createComponent('profiles');

    component.ngOnInit();

    expect((component as any).preferredSignal).toBeUndefined();
    expect(component.signalCards.map(item => item.signal)).toEqual(['metrics', 'logs', 'traces']);
    expect(component.signalGuides.map(item => item.signal)).toEqual(['metrics', 'logs', 'traces']);
  });

  it('should open the OTLP metrics console with the latest entity and service context', () => {
    const component = createComponent();
    component.bindingSummary = {
      canonicalIdentityKeys: [],
      recentServices: ['checkout'],
      recentIdentitySamples: [],
      recentBoundEntities: [
        {
          entityId: 42,
          name: 'checkout-api',
          displayName: 'Checkout API',
          primaryIdentityValue: 'checkout',
          monitorBindCount: 0
        }
      ]
    } as OtlpEntityBindingSummary;
    component.overview.latestObservedAt = 2_000;

    component.jumpToMetricsConsole();

    expect((component as any).router.navigate).toHaveBeenCalledWith(['/ingestion/otlp/metrics'], {
      queryParams: jasmine.objectContaining({
        entityId: '42',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        start: '0',
        end: '2000',
        returnTo: '/ingestion/otlp',
        returnLabel: 'ingestion.otlp.title'
      })
    });
  });

  it('should render state banner and code block text with visible light colors on the dark page', async () => {
    const otlpIngestionSvc = jasmine.createSpyObj<OtlpIngestionService>('OtlpIngestionService', ['getOverview', 'getGuide', 'getBindings']);
    const authSvc = jasmine.createSpyObj<AuthService>('AuthService', ['generateToken']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const notification = jasmine.createSpyObj<NzNotificationService>('NzNotificationService', ['success', 'warning']);
    const i18n = { fanyi: (key: string) => key };

    otlpIngestionSvc.getOverview.and.returnValue(of(successMessage(new OtlpIngestionOverview())));
    otlpIngestionSvc.getGuide.and.returnValue(of(successMessage(createGuide())));
    otlpIngestionSvc.getBindings.and.returnValue(of(successMessage(new OtlpEntityBindingSummary())));

    await TestBed.configureTestingModule({
      imports: [OtlpCenterComponent, NoopAnimationsModule],
      providers: [
        { provide: OtlpIngestionService, useValue: otlpIngestionSvc },
        { provide: AuthService, useValue: authSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({})
            }
          }
        },
        { provide: Router, useValue: router },
        { provide: NzNotificationService, useValue: notification },
        { provide: ALAIN_I18N_TOKEN, useValue: i18n }
      ]
    }).compileComponents();

    const fixture: ComponentFixture<OtlpCenterComponent> = TestBed.createComponent(OtlpCenterComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-page-shell')).not.toBeNull();
    const alertMessage = root.querySelector('.ingestion-state-title') as HTMLElement;
    const alertDescription = root.querySelector('.ingestion-state-body') as HTMLElement;
    const codeString = root.querySelector('.hljs-string') as HTMLElement;

    expect(alertMessage).withContext('state banner title should render').not.toBeNull();
    expect(alertDescription).withContext('state banner description should render').not.toBeNull();
    expect(codeString).withContext('code block should render highlighted string').not.toBeNull();

    expect(getLuminance(getComputedStyle(alertMessage).color)).withContext('state banner title should not be dark text').toBeGreaterThan(120);
    expect(getLuminance(getComputedStyle(alertDescription).color)).withContext('state banner body should not be dark text').toBeGreaterThan(100);
    expect(getLuminance(getComputedStyle(codeString).color)).withContext('code snippet highlight should stay readable').toBeGreaterThan(110);
  });

  it('should render the otlp center as flat sections without the legacy hero shell', async () => {
    const otlpIngestionSvc = jasmine.createSpyObj<OtlpIngestionService>('OtlpIngestionService', ['getOverview', 'getGuide', 'getBindings']);
    const authSvc = jasmine.createSpyObj<AuthService>('AuthService', ['generateToken']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const notification = jasmine.createSpyObj<NzNotificationService>('NzNotificationService', ['success', 'warning']);
    const i18n = { fanyi: (key: string) => key };

    otlpIngestionSvc.getOverview.and.returnValue(of(successMessage(new OtlpIngestionOverview())));
    otlpIngestionSvc.getGuide.and.returnValue(of(successMessage(createGuide())));
    otlpIngestionSvc.getBindings.and.returnValue(of(successMessage(new OtlpEntityBindingSummary())));

    await TestBed.configureTestingModule({
      imports: [OtlpCenterComponent, NoopAnimationsModule],
      providers: [
        { provide: OtlpIngestionService, useValue: otlpIngestionSvc },
        { provide: AuthService, useValue: authSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({})
            }
          }
        },
        { provide: Router, useValue: router },
        { provide: NzNotificationService, useValue: notification },
        { provide: ALAIN_I18N_TOKEN, useValue: i18n }
      ]
    }).compileComponents();

    const fixture: ComponentFixture<OtlpCenterComponent> = TestBed.createComponent(OtlpCenterComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-page-shell')).not.toBeNull();
    expect(root.querySelector('.page-hero')).toBeNull();
    expect(root.querySelector('app-platform-facts-strip.ingestion-console-strip')).not.toBeNull();
    expect(root.querySelectorAll('app-platform-stage-meta-header').length).toBeGreaterThan(0);
    expect(root.querySelector('app-platform-summary-metric-grid')).not.toBeNull();
    expect(root.querySelector('app-platform-support-panel.ingestion-workspace-panel')).not.toBeNull();
    expect(root.querySelector('app-platform-support-action-bar')).not.toBeNull();
    expect(root.querySelectorAll('app-platform-drawer-section-list').length).toBe(3);
    expect(root.querySelectorAll('app-platform-context-chip-bar.ingestion-binding-chip-bar').length).toBeGreaterThan(0);
    expect(root.querySelector('app-platform-drawer-section-list.ingestion-guide-section-list')).not.toBeNull();
    expect(root.querySelector('app-platform-drawer-pill-row.ingestion-guide-protocols')).not.toBeNull();
    expect(root.querySelector('app-platform-key-value-grid.ingestion-guide-auth-grid')).not.toBeNull();
    expect(root.querySelector('app-platform-support-panel.ingestion-token-panel')).not.toBeNull();
    expect(root.querySelector('.ingestion-console-strip-item')).toBeNull();
    expect(root.querySelector('.ingestion-state-surface')).not.toBeNull();
    expect(root.querySelectorAll('.ingestion-state-row').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('.ingestion-state-banner').length).toBe(0);
    expect(root.querySelectorAll('.ingestion-section-panel').length).toBeGreaterThan(0);
    expect(root.querySelector('.identity-sample-list')).toBeNull();
    expect(root.querySelector('.bound-entity-list')).toBeNull();
    expect(root.querySelector('.identity-key-inline-list')).toBeNull();
    expect(root.querySelector('.guide-protocols')).toBeNull();
    expect(root.querySelector('.guide-auth')).toBeNull();
    expect(root.querySelector('.guide-signals')).toBeNull();
    expect(root.querySelector('.token-panel')).toBeNull();
  });
});
