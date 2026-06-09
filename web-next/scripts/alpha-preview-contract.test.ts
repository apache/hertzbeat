import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '..');

describe('alpha preview documentation contract', () => {
  it('keeps the three-signal SigNoz-alignment scope honest and live-proof backed', () => {
    const source = readFileSync(resolve(repoRoot, 'docs/alpha-preview.md'), 'utf8');
    const collapsed = source.replace(/\s+/g, ' ');

    expect(source).toContain('## Three-Signal SigNoz-Alignment Alpha Cutoff');
    expect(source).toContain('not as a full parity claim');
    expect(collapsed).toContain('operator workflow where metrics, logs, and traces can stay attached to the same HertzBeat entity context');
    expect(collapsed).toContain('Saved query views, dashboard panel drafts, dashboard variables, and persisted');
    expect(collapsed).toContain('A service overview dashboard with RED-style metrics, Apdex, database calls');
    expect(collapsed).toContain('An operation drilldown dashboard from `operationName` context');
    expect(collapsed).toContain('metrics filtered by `operation`');
    expect(collapsed).toContain('logs filtered by `http.route`');
    expect(collapsed).toContain('traces filtered by `operationName`');
    expect(collapsed).toContain('Runtime dashboard evidence flows from metric/log/trace points');
    expect(collapsed).toContain('Stable entity binding from OpenTelemetry resource identity');

    expect(collapsed).toContain('does not claim full SigNoz parity');
    expect(collapsed).toContain('public dashboard sharing');
    expect(collapsed).toContain('Terraform-managed dashboards');
    expect(collapsed).toContain('prebuilt dashboard template marketplace');
    expect(collapsed).toContain('ClickHouse SQL dashboard builder');
    expect(collapsed).toContain('log pipeline builder');
    expect(collapsed).toContain('cost-meter dashboards');
    expect(collapsed).toContain('full flamegraph parity');
    expect(collapsed).toContain('automatic APM RED metric derivation from traces');

    expect(collapsed).toContain('Runtime signal dimensions such as `trace_id`, `span.name`, `http.route`');
    expect(collapsed).toContain('must not be promoted into long-lived `ObserveEntity` identities');
    expect(source).toContain('TRACE_ID=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b bash script/dev/run-three-signal-live-proof.sh');
    expect(collapsed).toContain('saved-view dashboard replay, service overview, and operation drilldown');
    expect(collapsed).toContain('Do not describe it as');
  });
});
