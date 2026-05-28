export const HEADER_LOCALE_RELOAD_SPINNER_CLASS = 'page-loading ant-spin ant-spin-lg ant-spin-spinning';
export const HEADER_LOCALE_RELOAD_SPINNER_MARKER = 'angular-header-i18n-reload';

export function showHeaderLocaleReloadSpinner(doc: Document = document) {
  if (doc.querySelector(`[data-app-frame-locale-reload="${HEADER_LOCALE_RELOAD_SPINNER_MARKER}"]`)) {
    return;
  }

  const spinEl = doc.createElement('div');
  spinEl.setAttribute('class', HEADER_LOCALE_RELOAD_SPINNER_CLASS);
  spinEl.setAttribute('data-app-frame-locale-reload', HEADER_LOCALE_RELOAD_SPINNER_MARKER);
  spinEl.innerHTML = '<span class="ant-spin-dot ant-spin-dot-spin"><i></i><i></i><i></i><i></i></span>';
  doc.body.appendChild(spinEl);
}
