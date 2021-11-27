// 请参考：https://ng-alain.com/docs/i18n
import { Platform } from '@angular/cdk/platform';
import { registerLocaleData } from '@angular/common';
import ngEn from '@angular/common/locales/en';
import ngZh from '@angular/common/locales/zh';
import ngZhTw from '@angular/common/locales/zh-Hant';
import { Injectable } from '@angular/core';
import {
  DelonLocaleService,
  en_US as delonEnUS,
  SettingsService,
  zh_CN as delonZhCn,
  zh_TW as delonZhTw,
  _HttpClient,
  AlainI18nBaseService
} from '@delon/theme';
import { AlainConfigService } from '@delon/util/config';
import { enUS as dfEn, zhCN as dfZhCn, zhTW as dfZhTw } from 'date-fns/locale';
import { NzSafeAny } from 'ng-zorro-antd/core/types';
import { en_US as zorroEnUS, NzI18nService, zh_CN as zorroZhCN, zh_TW as zorroZhTW } from 'ng-zorro-antd/i18n';
import { Observable } from 'rxjs';

interface LangConfigData {
  abbr: string;
  text: string;
  ng: NzSafeAny;
  zorro: NzSafeAny;
  date: NzSafeAny;
  delon: NzSafeAny;
}

const DEFAULT = 'zh-CN';
const LANGS: { [key: string]: LangConfigData } = {
  'zh-CN': {
    text: '简体中文',
    ng: ngZh,
    zorro: zorroZhCN,
    date: dfZhCn,
    delon: delonZhCn,
    abbr: '🇨🇳'
  },
  'zh-TW': {
    text: '繁体中文',
    ng: ngZhTw,
    zorro: zorroZhTW,
    date: dfZhTw,
    delon: delonZhTw,
    abbr: '🇭🇰'
  },
  'en-US': {
    text: 'English',
    ng: ngEn,
    zorro: zorroEnUS,
    date: dfEn,
    delon: delonEnUS,
    abbr: '🇬🇧'
  }
};

@Injectable({ providedIn: 'root' })
export class I18NService extends AlainI18nBaseService {
  protected _defaultLang = DEFAULT;
  private _langs = Object.keys(LANGS).map(code => {
    const item = LANGS[code];
    return { code, text: item.text, abbr: item.abbr };
  });

  constructor(
    private http: _HttpClient,
    private settings: SettingsService,
    private nzI18nService: NzI18nService,
    private delonLocaleService: DelonLocaleService,
    private platform: Platform,
    cogSrv: AlainConfigService
  ) {
    super(cogSrv);

    const defaultLang = this.getDefaultLang();
    this._defaultLang = this._langs.findIndex(w => w.code === defaultLang) === -1 ? DEFAULT : defaultLang;
  }

  private getDefaultLang(): string {
    if (!this.platform.isBrowser) {
      return DEFAULT;
    }
    if (this.settings.layout.lang) {
      return this.settings.layout.lang;
    }
    let res = (navigator.languages ? navigator.languages[0] : null) || navigator.language;
    const arr = res.split('-');
    return arr.length <= 1 ? res : `${arr[0]}-${arr[1].toUpperCase()}`;
  }

  loadLangData(lang: string): Observable<NzSafeAny> {
    return this.http.get(`assets/tmp/i18n/${lang}.json`);
  }

  use(lang: string, data: Record<string, unknown>): void {
    if (this._currentLang === lang) return;

    this._data = this.flatData(data, []);

    const item = LANGS[lang];
    registerLocaleData(item.ng);
    this.nzI18nService.setLocale(item.zorro);
    this.nzI18nService.setDateLocale(item.date);
    this.delonLocaleService.setLocale(item.delon);
    this._currentLang = lang;

    this._change$.next(lang);
  }

  getLangs(): Array<{ code: string; text: string; abbr: string }> {
    return this._langs;
  }
}
