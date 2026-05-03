import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let documentRef: Document;
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    documentRef = document.implementation.createHTMLDocument('theme');
    service = new ThemeService(documentRef);
  });

  it('should default to dark-ops when no theme has been stored', () => {
    expect(service.getTheme()).toBe('dark-ops');
  });

  it('should apply the light observability theme without injecting legacy stylesheet links', () => {
    service.changeTheme('light-ops');

    expect(documentRef.body.getAttribute('data-theme')).toBe('light-ops');
    expect(localStorage.getItem('theme')).toBe('light-ops');
    expect(documentRef.getElementById('dark-theme')).toBeNull();
    expect(documentRef.getElementById('compact-theme')).toBeNull();
  });

  it('should normalize legacy themes into the workbench theme model', () => {
    expect(service.resolveWorkbenchTheme('dark')).toBe('dark-ops');
    expect(service.resolveWorkbenchTheme('default')).toBe('light-ops');
    expect(service.resolveWorkbenchTheme('compact')).toBe('light-ops');
  });

  it('should expose whether the active theme should render dark workbench surfaces', () => {
    expect(service.isDarkTheme('dark-ops')).toBeTrue();
    expect(service.isDarkTheme('dark')).toBeTrue();
    expect(service.isDarkTheme('light-ops')).toBeFalse();
  });
});
