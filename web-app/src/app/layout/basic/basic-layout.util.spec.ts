import { resolveSettingDrawerVisibility } from './basic-layout.util';

describe('resolveSettingDrawerVisibility', () => {
  it('should keep the development setting drawer hidden even in non-production builds', () => {
    expect(resolveSettingDrawerVisibility(false)).toBeFalse();
  });
});
