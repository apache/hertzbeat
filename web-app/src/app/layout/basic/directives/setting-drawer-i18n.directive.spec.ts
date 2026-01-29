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

import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Component, NgZone } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { of } from 'rxjs';

import { SettingDrawerI18nDirective } from './setting-drawer-i18n.directive';

@Component({
  template: `<setting-drawer appSettingDrawerI18n>
    <div class="setting-drawer__content">
      <div>主题色</div>
      <div>设置</div>
      <div>配置栏只在开发环境用于预览,生产环境不会展现,请拷贝后手动修改参数配置文件 src/styles/theme.less</div>
    </div>
  </setting-drawer>`
})
class TestComponent {}

describe('SettingDrawerI18nDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let directive: SettingDrawerI18nDirective;
  let i18nService: jasmine.SpyObj<I18NService>;
  let httpMock: HttpTestingController;
  let mockTranslations: { [key: string]: string };

  const mockI18nData = {
    'zh-CN': {
      'setting.drawer.theme.color': '主题色',
      'setting.drawer.settings': '设置',
      'setting.drawer.info.message': '配置栏只在开发环境用于预览,生产环境不会展现,请拷贝后手动修改参数配置文件 src/styles/theme.less'
    },
    'en-US': {
      'setting.drawer.theme.color': 'Theme Color',
      'setting.drawer.settings': 'Settings',
      'setting.drawer.info.message':
        'The configuration panel is only for preview in the development environment, it will not be displayed in the production environment. Please copy and manually modify the parameter configuration file src/styles/theme.less'
    },
    'ja-JP': {
      'setting.drawer.theme.color': 'テーマカラー',
      'setting.drawer.settings': '設定',
      'setting.drawer.info.message':
        '設定パネルは開発環境でのプレビューのみに使用され、本番環境では表示されません。コピーして、パラメータ設定ファイル src/styles/theme.less を手動で変更してください'
    },
    'pt-BR': {
      'setting.drawer.theme.color': 'Cor do Tema',
      'setting.drawer.settings': 'Configurações',
      'setting.drawer.info.message':
        'O painel de configuração é apenas para visualização no ambiente de desenvolvimento, não será exibido no ambiente de produção. Por favor, copie e modifique manualmente o arquivo de configuração de parâmetros src/styles/theme.less'
    },
    'zh-TW': {
      'setting.drawer.theme.color': '主題色',
      'setting.drawer.settings': '設置',
      'setting.drawer.info.message': '配置欄只在開發環境用於預覽,生產環境不會展現,請拷貝後手動修改參數配置文件 src/styles/theme.less'
    }
  };

  beforeEach(async () => {
    mockTranslations = {
      'setting.drawer.theme.color': 'Theme Color',
      'setting.drawer.settings': 'Settings',
      'setting.drawer.info.message':
        'The configuration panel is only for preview in the development environment, it will not be displayed in the production environment. Please copy and manually modify the parameter configuration file src/styles/theme.less'
    };

    const i18nServiceSpy = jasmine.createSpyObj('I18NService', ['fanyi', 'change'], {
      change: of('en-US')
    });

    i18nServiceSpy.fanyi.and.callFake((key: string) => {
      return mockTranslations[key] || key;
    });

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [TestComponent, SettingDrawerI18nDirective],
      providers: [{ provide: ALAIN_I18N_TOKEN, useValue: i18nServiceSpy }, NgZone]
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    i18nService = TestBed.inject(ALAIN_I18N_TOKEN) as jasmine.SpyObj<I18NService>;
    httpMock = TestBed.inject(HttpTestingController);

    const directiveEl = fixture.debugElement.query(By.directive(SettingDrawerI18nDirective));
    if (directiveEl) {
      directive = directiveEl.injector.get(SettingDrawerI18nDirective);
    }
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(directive).toBeTruthy();
  });

  it('should load mappings from i18n files', fakeAsync(() => {
    fixture.detectChanges();

    const languages = ['zh-CN', 'en-US', 'ja-JP', 'pt-BR', 'zh-TW'];
    const requests = languages.map(lang => httpMock.expectOne(`./assets/i18n/${lang}.json`));

    languages.forEach((lang, index) => {
      requests[index].flush(mockI18nData[lang as keyof typeof mockI18nData]);
    });

    tick(100);
    fixture.detectChanges();

    expect(i18nService.fanyi).toHaveBeenCalled();
  }));

  it('should replace Chinese text with translations', fakeAsync(() => {
    fixture.detectChanges();

    const languages = ['zh-CN', 'en-US', 'ja-JP', 'pt-BR', 'zh-TW'];
    const requests = languages.map(lang => httpMock.expectOne(`./assets/i18n/${lang}.json`));

    languages.forEach((lang, index) => {
      requests[index].flush(mockI18nData[lang as keyof typeof mockI18nData]);
    });

    tick(2000);
    fixture.detectChanges();
    tick(100);

    const content = fixture.nativeElement.querySelector('.setting-drawer__content');
    if (content) {
      const themeColorDiv = content.querySelector('div:first-child');
      if (themeColorDiv) {
        expect(themeColorDiv.textContent).toContain('Theme Color');
      }
    }
  }));
});
