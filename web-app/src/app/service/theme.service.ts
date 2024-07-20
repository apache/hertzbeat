import {Inject, Injectable} from '@angular/core';
import {DOCUMENT} from "@angular/common";

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly themeKey = 'theme';

  constructor(@Inject(DOCUMENT) private doc: any) { }


  setTheme(theme: string): void {
    localStorage.setItem(this.themeKey, theme);
  }

  getTheme(): string | null {
    return localStorage.getItem(this.themeKey);
  }

  clearTheme(): void {
    localStorage.removeItem(this.themeKey);
  }

  changeTheme(theme: string): void {
    const style = this.doc.createElement('link');
    style.type = 'text/css';
    style.rel = 'stylesheet';

    if (theme === 'dark') {
      style.id = 'dark-theme';
      style.href = 'assets/style.dark.css';
    } else if (theme === 'compact') {
      style.id = 'compact-theme';
      style.href = 'assets/style.compact.css';
    } else {
      const darkDom = this.doc.getElementById('dark-theme');
      if (darkDom) darkDom.remove();

      const compactDom = this.doc.getElementById('compact-theme');
      if (compactDom) compactDom.remove();

      this.clearTheme();

      return;
    }

    this.setTheme(theme);

    // 移除旧的主题
    const existingLink = this.doc.getElementById(style.id);
    if (existingLink) {
      existingLink.remove();
    }

    // 添加新的主题
    this.doc.body.appendChild(style);
  }
}
