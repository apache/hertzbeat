import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webNextRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(webNextRoot, '..');

function hasAll(source, needles) {
  return needles.every(needle => source.includes(needle));
}

function collapsed(source) {
  return source.replace(/\s+/g, ' ');
}

export const THREE_SIGNAL_ALPHA_CUTOFF_ITEMS = [
  {
    key: 'alpha-cutoff-doc',
    label: 'Alpha docs define the three-signal SigNoz-alignment cutoff without claiming full parity',
    verify: files => {
      const doc = collapsed(files.alphaPreview);
      return hasAll(files.alphaPreview, [
        '## Three-Signal SigNoz-Alignment Alpha Cutoff',
        'not as a full parity claim',
        'TRACE_ID=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b bash script/dev/run-three-signal-live-proof.sh'
      ]) && hasAll(doc, [
        'does not claim full SigNoz parity',
        'public dashboard sharing',
        'Terraform-managed dashboards',
        'ClickHouse SQL dashboard builder',
        'log pipeline builder',
        'automatic APM RED metric derivation from traces'
      ]);
    }
  },
  {
    key: 'live-proof-default',
    label: 'Default live proof runs saved-view replay, service overview, and operation drilldown',
    verify: files => hasAll(files.liveProofScript, [
      'jdbc:h2:mem:hb_live_smoke;MODE=MYSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE',
      'promotes logs, traces, and metrics saved views into a persisted replay dashboard',
      'saves a service overview dashboard from URL service and entity context',
      'saves an operation drilldown dashboard from URL operation context',
      'READY_ATTEMPTS="${READY_ATTEMPTS:-300}"'
    ])
  },
  {
    key: 'service-overview-evidence',
    label: 'Service overview dashboard is covered by live browser/API persistence evidence',
    verify: files => hasAll(files.liveBrowserSmoke, [
      'buildSignalServiceOverviewDashboard',
      'data-dashboard-service-overview-action="save"',
      'data-dashboard-service-overview-context="ready"',
      'Checkout API service overview',
      "toHaveCount(18",
      'Service overview request rate: service.name=checkout',
      'Service overview exceptions: service.name=checkout',
      'Service overview firing alerts: service.name=checkout'
    ])
  },
  {
    key: 'operation-drilldown-evidence',
    label: 'Operation drilldown dashboard is covered by live browser/API persistence evidence',
    verify: files => hasAll(files.liveBrowserSmoke, [
      'buildSignalOperationDrilldownDashboard',
      'data-dashboard-operation-drilldown-action="save"',
      'data-dashboard-operation-drilldown-context="ready"',
      'Checkout API POST /checkout operation drilldown',
      "toHaveCount(8",
      'operation%3D%22POST+%2Fcheckout%22',
      'attributeFilter=http.route%3APOST+%2Fcheckout',
      'operationName=POST+%2Fcheckout'
    ])
  },
  {
    key: 'runtime-dimension-boundary',
    label: 'Runtime signal dimensions remain drilldown dimensions, not long-lived entity identities',
    verify: files => {
      const doc = collapsed(files.alphaPreview);
      return hasAll(doc, [
        'Runtime signal dimensions such as `trace_id`, `span.name`, `http.route`',
        'must not be promoted into long-lived `ObserveEntity` identities'
      ]) && hasAll(files.identityRegistry, [
        'RUNTIME_SIGNAL_DIMENSION_KEYS',
        '"trace_id"',
        '"span.name"',
        '"http.route"',
        '"exception.type"',
        'isRuntimeSignalDimensionKey'
      ]) && hasAll(files.identityRegistryTest, [
        'assertTrue(EntityCanonicalIdentityRegistry.isRuntimeSignalDimensionKey("trace_id"))',
        'assertFalse(EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey("http.route"))',
        'assertEquals(0, EntityCanonicalIdentityRegistry.defaultPriority("trace_id"))'
      ]);
    }
  }
];

export function readThreeSignalAlphaCutoffFiles(rootDir = repoRoot) {
  const readRepoFile = relativePath => readFileSync(path.join(rootDir, relativePath), 'utf8');
  return {
    alphaPreview: readRepoFile('docs/alpha-preview.md'),
    liveProofScript: readRepoFile('script/dev/run-three-signal-live-proof.sh'),
    liveBrowserSmoke: readRepoFile('web-next/scripts/dashboard-source-edit-live-browser-smoke.spec.ts'),
    identityRegistry: readRepoFile('hertzbeat-common-core/src/main/java/org/apache/hertzbeat/common/observability/model/EntityCanonicalIdentityRegistry.java'),
    identityRegistryTest: readRepoFile('hertzbeat-common-core/src/test/java/org/apache/hertzbeat/common/observability/model/EntityCanonicalIdentityRegistryTest.java')
  };
}

export function evaluateThreeSignalAlphaCutoff(files = readThreeSignalAlphaCutoffFiles()) {
  return THREE_SIGNAL_ALPHA_CUTOFF_ITEMS.map(item => ({
    key: item.key,
    label: item.label,
    passed: Boolean(item.verify(files))
  }));
}

export function verifyThreeSignalAlphaCutoff(files = readThreeSignalAlphaCutoffFiles()) {
  const results = evaluateThreeSignalAlphaCutoff(files);
  const failures = results.filter(result => !result.passed);
  if (failures.length > 0) {
    throw new Error(`Three-signal alpha cutoff failed: ${failures.map(result => result.key).join(', ')}`);
  }
  return results;
}

export function formatThreeSignalAlphaCutoffReport(results = evaluateThreeSignalAlphaCutoff()) {
  return [
    'Three-signal alpha cutoff report',
    ...results.map(result => `${result.passed ? 'ok' : 'missing'} ${result.key}: ${result.label}`)
  ].join('\n');
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const results = verifyThreeSignalAlphaCutoff();
  console.log(formatThreeSignalAlphaCutoffReport(results));
}
