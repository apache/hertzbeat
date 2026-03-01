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

import { HttpClient } from '@angular/common/http';
import { Directive, ElementRef, Inject, OnInit, OnDestroy, AfterViewInit, NgZone } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

@Directive({
  selector: 'setting-drawer[appSettingDrawerI18n]'
})
export class SettingDrawerI18nDirective implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private mutationObserver?: MutationObserver;
  private replaceInterval?: any;

  private textMappings: { [key: string]: string } = {};
  private mappingsReady = false;

  private readonly settingDrawerKeys = [
    'setting.drawer.theme.color',
    'setting.drawer.settings',
    'setting.drawer.top',
    'setting.drawer.sidebar',
    'setting.drawer.content',
    'setting.drawer.other',
    'setting.drawer.height',
    'setting.drawer.background.color',
    'setting.drawer.background.color.default',
    'setting.drawer.top.padding',
    'setting.drawer.fixed.header.sidebar',
    'setting.drawer.colorblind.mode',
    'setting.drawer.preview',
    'setting.drawer.reset',
    'setting.drawer.copy',
    'setting.drawer.info.message'
  ];

  private readonly languages = ['zh-CN', 'en-US', 'ja-JP', 'pt-BR', 'zh-TW'];

  constructor(
    private el: ElementRef<HTMLElement>,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private ngZone: NgZone,
    private http: HttpClient
  ) {
    this.loadMappingsFromI18nFiles();
  }

  private loadMappingsFromI18nFiles(): void {
    const requests = this.languages.map(lang =>
      this.http.get<{ [key: string]: string }>(`./assets/i18n/${lang}.json`).pipe(map(data => ({ lang, data })))
    );

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        this.textMappings = {};

        for (const key of this.settingDrawerKeys) {
          for (const result of results) {
            const translation = result.data[key];
            if (translation && translation.trim()) {
              this.textMappings[translation] = key;
            }
          }
        }

        const sortedEntries = Object.entries(this.textMappings).sort((a, b) => b[0].length - a[0].length);
        this.textMappings = Object.fromEntries(sortedEntries);

        this.mappingsReady = true;

        setTimeout(() => this.replaceText(), 0);
      });
  }

  ngOnInit(): void {
    setTimeout(() => this.replaceText(), 0);
    setTimeout(() => this.replaceText(), 100);
    setTimeout(() => this.replaceText(), 500);
    setTimeout(() => this.replaceText(), 1000);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.replaceText(), 0);
    setTimeout(() => this.replaceText(), 100);
    setTimeout(() => this.replaceText(), 200);
    setTimeout(() => this.replaceText(), 500);
    setTimeout(() => this.replaceText(), 1000);
    setTimeout(() => this.replaceText(), 2000);

    this.ngZone.runOutsideAngular(() => {
      let timeoutId: any;
      this.mutationObserver = new MutationObserver(mutations => {
        if (mutations.length > 0) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          timeoutId = setTimeout(() => {
            this.ngZone.run(() => {
              this.replaceText();
            });
          }, 50);
        }
      });

      this.mutationObserver.observe(this.el.nativeElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: false
      });
    });

    this.replaceInterval = setInterval(() => {
      this.replaceText();
    }, 500);

    this.i18nSvc.change.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.replaceText();
    });
  }

  ngOnDestroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    if (this.replaceInterval) {
      clearInterval(this.replaceInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private replaceText(): void {
    if (!this.mappingsReady || Object.keys(this.textMappings).length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      const drawerContent =
        document.querySelector('.setting-drawer__content') || document.querySelector('setting-drawer') || this.el.nativeElement;

      if (!drawerContent) {
        return;
      }

      const currentTranslations = new Map<string, string>();
      for (const key of this.settingDrawerKeys) {
        const translation = this.i18nSvc.fanyi(key);
        if (translation && translation !== key) {
          currentTranslations.set(key, translation);
        }
      }

      const currentTranslationValues = Array.from(currentTranslations.values());

      const processedNodes = new Set<Node>();

      const walker = document.createTreeWalker(drawerContent as Node, NodeFilter.SHOW_TEXT, {
        acceptNode: (node: Node) => {
          const parent = node.parentElement;
          if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent && (parent.tagName === 'INPUT' || parent.tagName === 'TEXTAREA' || parent.tagName === 'SELECT')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      let textNode;
      while ((textNode = walker.nextNode())) {
        if (processedNodes.has(textNode)) continue;
        processedNodes.add(textNode);

        const textContent = textNode.textContent || '';
        if (!textContent.trim()) continue;

        let newText = textContent;
        let hasChanges = false;

        const alreadyTranslated = currentTranslationValues.some(trans => textContent.includes(trans));
        if (alreadyTranslated) {
          continue;
        }

        for (const [knownText, translationKey] of Object.entries(this.textMappings)) {
          const currentTranslation = currentTranslations.get(translationKey);
          if (!currentTranslation) continue;

          if (newText.includes(knownText) && knownText !== currentTranslation && !newText.includes(currentTranslation)) {
            newText = newText.replace(new RegExp(this.escapeRegExp(knownText), 'g'), currentTranslation);
            hasChanges = true;
          }
        }

        if (hasChanges && newText !== textContent) {
          textNode.textContent = newText;
        }
      }

      const allElements = (drawerContent as HTMLElement).querySelectorAll('*');
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const htmlElement = el as HTMLElement;

        if (['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT'].includes(htmlElement.tagName)) {
          continue;
        }

        if (htmlElement.children.length === 0 && htmlElement.textContent) {
          const textContent = htmlElement.textContent;
          if (!textContent.trim()) continue;

          if (htmlElement.childNodes.length === 1 && htmlElement.childNodes[0].nodeType === Node.TEXT_NODE) {
            if (processedNodes.has(htmlElement.childNodes[0])) {
              continue;
            }
          }

          const alreadyTranslated = currentTranslationValues.some(trans => textContent.includes(trans));
          if (alreadyTranslated) {
            continue;
          }

          let newText = textContent;
          let hasChanges = false;

          for (const [knownText, translationKey] of Object.entries(this.textMappings)) {
            const currentTranslation = currentTranslations.get(translationKey);
            if (!currentTranslation) continue;

            if (newText.includes(knownText) && knownText !== currentTranslation && !newText.includes(currentTranslation)) {
              newText = newText.replace(new RegExp(this.escapeRegExp(knownText), 'g'), currentTranslation);
              hasChanges = true;
            }
          }

          if (hasChanges && newText !== textContent) {
            htmlElement.textContent = newText;
          }
        }
      }

      const infoMessageKey = 'setting.drawer.info.message';
      const currentInfoMessage = currentTranslations.get(infoMessageKey);

      if (currentInfoMessage) {
        const allInfoMessages: string[] = [];
        for (const [text, key] of Object.entries(this.textMappings)) {
          if (key === infoMessageKey && text !== currentInfoMessage) {
            allInfoMessages.push(text);
          }
        }

        const chinesePhrases = [
          '配置栏只在开发环境用于',
          '配置栏只在開發環境用於',
          '生产环境不会展现',
          '生產環境不會展現',
          '请拷贝后手动修改',
          '請拷貝後手動修改',
          '参数配置文件',
          '參數配置文件',
          'src/styles/theme.less'
        ];

        const containers = (drawerContent as HTMLElement).querySelectorAll('div, span, p, li, td, section, article');
        for (let i = 0; i < containers.length; i++) {
          const container = containers[i] as HTMLElement;
          const containerText = container.textContent || '';

          if (containerText.includes(currentInfoMessage)) {
            continue;
          }

          let containsInfoMessage = false;
          for (const knownInfoMsg of allInfoMessages) {
            if (containerText.includes(knownInfoMsg)) {
              containsInfoMessage = true;
              break;
            }
          }

          if (!containsInfoMessage) {
            containsInfoMessage = chinesePhrases.some(phrase => containerText.includes(phrase));
          }

          const hasChineseChars = /[\u4e00-\u9fa5]/.test(containerText);
          const isLongEnough = containerText.length > 50;

          if (containsInfoMessage || (hasChineseChars && isLongEnough && containerText.includes('src/styles/theme.less'))) {
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);

            let textNode;
            const textNodes: Node[] = [];

            while ((textNode = walker.nextNode())) {
              if (!processedNodes.has(textNode)) {
                textNodes.push(textNode);
              }
            }

            if (textNodes.length > 0) {
              textNodes[0].textContent = currentInfoMessage;
              processedNodes.add(textNodes[0]);

              for (let j = 1; j < textNodes.length; j++) {
                textNodes[j].textContent = '';
                processedNodes.add(textNodes[j]);
              }
            } else {
              container.textContent = currentInfoMessage;
            }
            break;
          }
        }
      }

      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const htmlElement = el as HTMLElement;

        const attributesToCheck = ['placeholder', 'title', 'aria-label', 'alt'];
        for (let j = 0; j < attributesToCheck.length; j++) {
          const attr = attributesToCheck[j];
          if (htmlElement.hasAttribute(attr)) {
            const attrValue = htmlElement.getAttribute(attr);
            if (attrValue) {
              let newValue = attrValue;
              let hasChanges = false;

              for (const [knownText, translationKey] of Object.entries(this.textMappings)) {
                const currentTranslation = currentTranslations.get(translationKey);
                if (!currentTranslation) continue;

                if (newValue.includes(knownText) && knownText !== currentTranslation && !newValue.includes(currentTranslation)) {
                  newValue = newValue.replace(new RegExp(this.escapeRegExp(knownText), 'g'), currentTranslation);
                  hasChanges = true;
                }
              }

              if (hasChanges && newValue !== attrValue) {
                htmlElement.setAttribute(attr, newValue);
              }
            }
          }
        }
      }
    });
  }

  private escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
