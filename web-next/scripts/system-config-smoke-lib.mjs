export const SYSTEM_CONFIG_SMOKE_ROUTE = '/setting/settings/config';

export const SYSTEM_CONFIG_SMOKE_LOCALES = ['en_US', 'zh_CN', 'zh_TW', 'ja_JP', 'pt_BR'];
export const SYSTEM_CONFIG_SMOKE_THEMES = ['light-ops', 'dark-ops', 'compact'];

export function normalizeSystemConfigSmokeLocale(locale) {
  if (!locale) return '';
  return locale
    .replace('en-US', 'en_US')
    .replace('zh-CN', 'zh_CN')
    .replace('zh-TW', 'zh_TW')
    .replace('ja-JP', 'ja_JP')
    .replace('pt-BR', 'pt_BR');
}

export function normalizeSystemConfigSmokeTheme(theme) {
  if (!theme) return 'dark-ops';
  if (theme === 'light-ops' || theme === 'default') return 'light-ops';
  if (theme === 'compact') return 'compact';
  return 'dark-ops';
}

export function chooseAlternateValue(options, currentValue, preferredValues = []) {
  const normalizedCurrent = currentValue ?? null;
  const candidates = [...preferredValues, ...options.filter(option => !preferredValues.includes(option))];
  return candidates.find(option => option !== normalizedCurrent) ?? null;
}

export function chooseSmokeTimezone(timezones, currentTimezone) {
  if (!Array.isArray(timezones) || timezones.length === 0) {
    throw new Error('System-config smoke requires at least one timezone option.');
  }

  const zoneIds = timezones
    .map(zone => zone?.zoneId)
    .filter(zoneId => typeof zoneId === 'string' && zoneId.length > 0);

  const preferred = ['UTC', 'Asia/Shanghai', 'Europe/London'];
  const chosen = chooseAlternateValue(zoneIds, currentTimezone ?? null, preferred);
  if (!chosen) {
    throw new Error('System-config smoke could not choose an alternate timezone.');
  }
  return chosen;
}

export function buildSystemConfigSmokeCandidate(config, timezones) {
  const locale = chooseAlternateValue(
    SYSTEM_CONFIG_SMOKE_LOCALES,
    normalizeSystemConfigSmokeLocale(config?.locale),
    ['ja_JP', 'en_US', 'zh_CN']
  );
  const theme = chooseAlternateValue(
    SYSTEM_CONFIG_SMOKE_THEMES,
    normalizeSystemConfigSmokeTheme(config?.theme),
    ['compact', 'light-ops', 'dark-ops']
  );
  const timeZoneId = chooseSmokeTimezone(timezones, config?.timeZoneId ?? null);

  if (!locale || !theme || !timeZoneId) {
    throw new Error('System-config smoke could not build a complete alternate config.');
  }

  return {
    locale,
    theme,
    timeZoneId
  };
}

export function summarizeSystemConfig(config) {
  return {
    locale: normalizeSystemConfigSmokeLocale(config?.locale),
    theme: normalizeSystemConfigSmokeTheme(config?.theme),
    timeZoneId: config?.timeZoneId ?? null
  };
}

export function findSystemConfigMismatches(actualConfig, expectedConfig) {
  const actual = summarizeSystemConfig(actualConfig);
  const expected = summarizeSystemConfig(expectedConfig);
  return ['locale', 'theme', 'timeZoneId'].filter(field => actual[field] !== expected[field]);
}

export async function runSystemConfigSmoke({
  baseUrl,
  routePath = SYSTEM_CONFIG_SMOKE_ROUTE,
  identifier = 'admin',
  credential = 'hertzbeat',
  loginType = 1,
  assertRouteLoads,
  loginWithPassword,
  requestMessage,
  requireMessageData,
  assertLocaleBundleLoads
}) {
  let originalConfig = null;
  let token = null;
  let mutatedConfig = false;
  let restored = false;
  let result = null;
  let primaryError = null;

  try {
    const routeBeforeSave = await assertRouteLoads(baseUrl, routePath);
    token = (await loginWithPassword(baseUrl, identifier, credential, loginType)).token;
    originalConfig = requireMessageData(
      await requestMessage(baseUrl, '/api/config/system', { token }),
      'Load system config'
    );
    const timezones = requireMessageData(
      await requestMessage(baseUrl, '/api/config/timezones', { token }),
      'Load timezones'
    );
    const smokeConfig = buildSystemConfigSmokeCandidate(originalConfig, timezones);

    requireMessageData(
      await requestMessage(baseUrl, '/api/config/system', {
        method: 'POST',
        token,
        body: smokeConfig
      }),
      'Save system config'
    );
    mutatedConfig = true;

    const persistedConfig = requireMessageData(
      await requestMessage(baseUrl, '/api/config/system', { token }),
      'Reload persisted system config'
    );
    const persistedMismatches = findSystemConfigMismatches(persistedConfig, smokeConfig);
    if (persistedMismatches.length > 0) {
      throw new Error(`Saved system config did not round-trip cleanly: ${persistedMismatches.join(', ')}`);
    }

    await assertLocaleBundleLoads(baseUrl, smokeConfig.locale);
    const routeAfterSave = await assertRouteLoads(baseUrl, routePath);
    const bootstrapConfig = requireMessageData(
      await requestMessage(baseUrl, '/api/config/system', { token }),
      'Reload config-system bootstrap path'
    );
    const bootstrapMismatches = findSystemConfigMismatches(bootstrapConfig, smokeConfig);
    if (bootstrapMismatches.length > 0) {
      throw new Error(`Config bootstrap path lost saved values after route reload: ${bootstrapMismatches.join(', ')}`);
    }

    result = {
      baseUrl,
      routePath,
      routeBeforeSave,
      routeAfterSave,
      originalConfig: summarizeSystemConfig(originalConfig),
      smokeConfig: summarizeSystemConfig(smokeConfig),
      persistedConfig: summarizeSystemConfig(persistedConfig),
      bootstrapConfig: summarizeSystemConfig(bootstrapConfig),
      restored: false
    };
  } catch (error) {
    primaryError = error;
  }

  if (baseUrl && token && originalConfig && mutatedConfig) {
    try {
      requireMessageData(
        await requestMessage(baseUrl, '/api/config/system', {
          method: 'POST',
          token,
          body: originalConfig
        }),
        'Restore original system config'
      );
      restored = true;
    } catch (error) {
      const cleanupMessage = error instanceof Error ? error.message : String(error);
      if (primaryError) {
        const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
        throw new Error(`${primaryMessage}\nRestore original system config failed: ${cleanupMessage}`);
      }
      throw error;
    }
  }

  if (primaryError) {
    throw primaryError;
  }

  if (!result) {
    throw new Error('System-config smoke finished without producing a result.');
  }

  return {
    ...result,
    restored
  };
}
