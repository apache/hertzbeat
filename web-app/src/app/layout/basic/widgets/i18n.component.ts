import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, Input } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, SettingsService } from '@delon/theme';
import { BooleanInput, InputBoolean } from '@delon/util/decorator';

@Component({
  selector: 'header-i18n',
  template: `
    <div *ngIf="showLangText" nz-dropdown [nzDropdownMenu]="langMenu" nzPlacement="bottomRight">
      <i nz-icon nzType="global"></i>
      {{ 'menu.lang' | i18n }}
      <i nz-icon nzType="down"></i>
    </div>
    <i *ngIf="!showLangText" nz-dropdown [nzDropdownMenu]="langMenu" nzPlacement="bottomRight" nz-icon nzType="global"></i>
    <nz-dropdown-menu #langMenu="nzDropdownMenu">
      <ul nz-menu>
        <li nz-menu-item *ngFor="let item of langs" [nzSelected]="item.code === curLangCode" (click)="change(item.code)">
          <span role="img" [attr.aria-label]="item.text" class="pr-xs">{{ item.abbr }}</span>
          {{ item.text }}
        </li>
      </ul>
    </nz-dropdown-menu>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderI18nComponent {
  static ngAcceptInputType_showLangText: BooleanInput;
  /** Whether to display language text */
  @Input() @InputBoolean() showLangText = true;

  get langs(): Array<{ code: string; text: string; abbr: string }> {
    return this.i18n.getLangs();
  }

  get curLangCode(): string {
    return this.settings.layout.lang;
  }

  constructor(private settings: SettingsService, @Inject(ALAIN_I18N_TOKEN) private i18n: I18NService, @Inject(DOCUMENT) private doc: any) {}

  change(lang: string): void {
    const spinEl = this.doc.createElement('div');
    spinEl.setAttribute('class', `page-loading ant-spin ant-spin-lg ant-spin-spinning`);
    spinEl.innerHTML = `<span class="ant-spin-dot ant-spin-dot-spin"><i></i><i></i><i></i><i></i></span>`;
    this.doc.body.appendChild(spinEl);

    this.i18n.loadLangData(lang).subscribe(res => {
      this.i18n.use(lang, res);
      this.settings.setLayout('lang', lang);
      setTimeout(() => this.doc.location.reload());
    });
  }
}
