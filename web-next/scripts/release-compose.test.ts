import { describe, expect, it } from 'vitest';

import {
  assertResolvedReleaseImages,
  composeConfigEnv,
  readRootReleaseVersion,
  rollbackProbeVersion,
  verifyReleaseComposeConfig
} from './release-compose.mjs';

describe('release compose gate', () => {
  it('resolves the root release version from hzb.version', () => {
    expect(readRootReleaseVersion('<project><properties><hzb.version>1.8.0</hzb.version></properties></project>')).toBe(
      '1.8.0',
    );
  });

  it('requires server image, web-next image, and web-next build arg to share the release version', () => {
    expect(() =>
      assertResolvedReleaseImages(
        [
          'image: apache/hertzbeat:1.8.0',
          'image: apache/hertzbeat-web-next:1.8.0',
          'HERTZBEAT_RELEASE_VERSION: 1.8.0'
        ].join('\n'),
        '1.8.0',
      ),
    ).not.toThrow();

    expect(() =>
      assertResolvedReleaseImages('image: apache/hertzbeat:1.8.0\nimage: apache/hertzbeat-web-next:old', '1.8.0'),
    ).toThrow('docker compose config did not resolve');
  });

  it('checks promotion and rollback versions through the compose config runner', () => {
    const checkedVersions: string[] = [];

    const result = verifyReleaseComposeConfig({
      releaseVersion: '1.8.0',
      rollbackVersion: '1.7.9',
      configRunner: version => {
        checkedVersions.push(version);
        return [
          `image: apache/hertzbeat:${version}`,
          `image: apache/hertzbeat-web-next:${version}`,
          `HERTZBEAT_RELEASE_VERSION: ${version}`
        ].join('\n');
      }
    });

    expect(result).toEqual({ releaseVersion: '1.8.0', rollbackVersion: '1.7.9' });
    expect(checkedVersions).toEqual(['1.8.0', '1.7.9']);
  });

  it('builds a deterministic rollback probe version when no rollback override is supplied', () => {
    expect(rollbackProbeVersion('1.8.0')).toBe('1.8.0-rollback-check');
    expect(composeConfigEnv('2.0.0', {}).HERTZBEAT_RELEASE_VERSION).toBe('2.0.0');
  });
});
