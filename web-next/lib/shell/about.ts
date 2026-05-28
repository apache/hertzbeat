export const ABOUT_NOT_SHOW_NEXT_LOGIN_KEY = 'NOT_SHOW_ABOUT_NEXT_LOGIN';
export const ABOUT_AUTO_SHOW_AFTER_LOGIN_KEY = 'HB_ABOUT_AUTO_SHOW_AFTER_LOGIN';

function getBrowserLocalStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

function getBrowserSessionStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  return window.sessionStorage;
}

export function readAboutNotShowNextLogin(): boolean {
  const localStorage = getBrowserLocalStorage();
  if (!localStorage) return false;
  const value = localStorage.getItem(ABOUT_NOT_SHOW_NEXT_LOGIN_KEY);
  if (value === null) return false;
  try {
    return JSON.parse(value) === true;
  } catch {
    return value === 'true';
  }
}

export function writeAboutNotShowNextLogin(value: boolean): void {
  const localStorage = getBrowserLocalStorage();
  if (!localStorage) return;
  localStorage.setItem(ABOUT_NOT_SHOW_NEXT_LOGIN_KEY, JSON.stringify(value));
}

export function markAboutAutoShowAfterLogin(): void {
  const sessionStorage = getBrowserSessionStorage();
  if (!sessionStorage) return;
  sessionStorage.setItem(ABOUT_AUTO_SHOW_AFTER_LOGIN_KEY, 'true');
}

export function consumeAboutAutoShowAfterLogin(): boolean {
  const sessionStorage = getBrowserSessionStorage();
  if (!sessionStorage) return false;
  const shouldShow = sessionStorage.getItem(ABOUT_AUTO_SHOW_AFTER_LOGIN_KEY) === 'true';
  sessionStorage.removeItem(ABOUT_AUTO_SHOW_AFTER_LOGIN_KEY);
  return shouldShow;
}
