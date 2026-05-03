/* eslint-disable import/no-unassigned-import */
// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { inject, NO_ERRORS_SCHEMA, Pipe, PipeTransform, Type } from '@angular/core';
import { getTestBed, TestBed, TestModuleMetadata } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { of } from 'rxjs';

@Pipe({ name: 'i18n', standalone: true })
class GlobalMockI18nPipe implements PipeTransform {
  private readonly i18n = inject<{ fanyi?: (key: string, params?: unknown) => string } | null>(ALAIN_I18N_TOKEN, {
    optional: true
  });

  transform(value: unknown, params?: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }
    if (typeof this.i18n?.fanyi === 'function') {
      return this.i18n.fanyi(value, params);
    }
    return value;
  }
}

function isStandaloneDeclarable(candidate: unknown): boolean {
  const definition = candidate as {
    ɵcmp?: { standalone?: boolean };
    ɵdir?: { standalone?: boolean };
    ɵpipe?: { standalone?: boolean };
  };
  return Boolean(definition?.ɵcmp?.standalone || definition?.ɵdir?.standalone || definition?.ɵpipe?.standalone);
}

function isNonStandaloneDeclarable(candidate: unknown): candidate is Type<unknown> {
  const definition = candidate as {
    ɵcmp?: object;
    ɵdir?: object;
    ɵpipe?: object;
  };
  return Boolean((definition?.ɵcmp || definition?.ɵdir || definition?.ɵpipe) && !isStandaloneDeclarable(candidate));
}

function hasPipeByName(candidates: unknown[], pipeName: string): boolean {
  const expected = pipeName.toLowerCase();
  return candidates.some(candidate => {
    const definition = candidate as {
      ɵpipe?: { name?: string };
      __annotations__?: Array<{ name?: string }>;
      name?: string;
    };
    return definition?.ɵpipe?.name?.toLowerCase() === expected
      || definition?.__annotations__?.some(annotation => annotation?.name?.toLowerCase() === expected)
      || definition?.name?.toLowerCase().includes(expected);
  });
}

const originalConfigureTestingModule = TestBed.configureTestingModule.bind(TestBed);
TestBed.configureTestingModule = ((moduleDef: TestModuleMetadata = {}) => {
  const normalizedImports = [...(moduleDef.imports ?? [])];
  const normalizedDeclarations = [...(moduleDef.declarations ?? [])];

  for (const candidate of moduleDef.imports ?? []) {
    if (isNonStandaloneDeclarable(candidate)) {
      normalizedImports.splice(normalizedImports.indexOf(candidate), 1);
      normalizedDeclarations.push(candidate);
    }
  }

  if (!hasPipeByName([...normalizedImports, ...normalizedDeclarations], 'i18n')) {
    normalizedImports.push(GlobalMockI18nPipe);
  }

  return originalConfigureTestingModule({
    ...moduleDef,
    imports: [...normalizedImports, NoopAnimationsModule],
    declarations: normalizedDeclarations,
    providers: [
      provideHttpClient(withInterceptorsFromDi()),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: NzModalService,
        useValue: {
          create: () => null,
          confirm: () => null,
          info: () => null,
          success: () => null,
          warning: () => null,
          error: () => null,
          closeAll: () => undefined
        }
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            params: {},
            queryParams: {},
            data: {},
            paramMap: { get: () => null },
            queryParamMap: { get: () => null }
          },
          params: of({}),
          queryParams: of({}),
          paramMap: of({ get: () => null }),
          queryParamMap: of({ get: () => null }),
          data: of({}),
          url: of([])
        }
      },
      ...(moduleDef.providers ?? [])
    ],
    schemas: [...(moduleDef.schemas ?? []), NO_ERRORS_SCHEMA]
  });
}) as typeof TestBed.configureTestingModule;

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);
