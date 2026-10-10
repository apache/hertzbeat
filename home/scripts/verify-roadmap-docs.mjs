import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const roadmapNames = [
  'index',
  'datadog-directory-map',
  'future-observability-pipelines',
  'future-collector-fleet-governance',
  'future-resource-catalog',
  'future-software-catalog',
  'future-application-performance',
  'future-incident-response',
  'future-topology-fault-analysis',
  'future-automation-action-catalog',
  'future-platform-governance',
  'future-security',
  'future-data-observability',
  'future-digital-experience',
  'future-software-delivery',
  'future-cloud-cost',
  'future-ai-observability',
  'future-developer-integrations'
];
const requiredIds = [
  ...roadmapNames.map(name => `roadmap/${name}`),
  'help/lmstudio',
  'help/ollama',
  'start/native-collector',
  'help/service_observability',
  'help/explore_saved_queries',
  'help/perses_dashboard'
];
const locales = [
  'home/docs',
  'home/i18n/zh-cn/docusaurus-plugin-content-docs/current'
];
const fail = message => {
  console.error(message);
  process.exitCode = 1;
};

const docIds = [];
let hasRoadmapCategory = false;
function inspectNavigation(items) {
  for (const item of items) {
    if (typeof item === 'string') {
      docIds.push(item);
    } else if (item.type === 'doc') {
      docIds.push(item.id);
    } else if (item.type === 'category') {
      hasRoadmapCategory ||= item.label === 'Roadmap';
      if (item.link?.type === 'doc') docIds.push(item.link.id);
      inspectNavigation(item.items);
    }
  }
}
const sidebars = JSON.parse(fs.readFileSync(path.join(repoRoot, 'home/sidebars.json'), 'utf8'));
for (const items of Object.values(sidebars)) inspectNavigation(items);
if (!hasRoadmapCategory) fail('Navigation must expose the Roadmap category.');

for (const id of requiredIds) {
  if (docIds.filter(value => value === id).length !== 1) {
    fail(`Navigation must include ${id} exactly once.`);
  }
  for (const locale of locales) {
    const file = path.join(repoRoot, locale, `${id}.md`);
    if (!fs.existsSync(file)) {
      fail(`Missing current documentation: ${locale}/${id}.md`);
      continue;
    }
    const content = fs.readFileSync(file, 'utf8');
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content)?.[1] ?? '';
    const declaredId = /^id:\s*(\S+)\s*$/m.exec(frontmatter)?.[1];
    if (declaredId !== path.posix.basename(id)) fail(`${locale}/${id}.md has an unexpected document id.`);
    if (id.startsWith('roadmap/')) {
      const expected = {
        'roadmap/index': 'directional',
        'roadmap/datadog-directory-map': 'reference'
      }[id] ?? 'proposed';
      const status = /^roadmap_status:\s*(\S+)\s*$/m.exec(frontmatter)?.[1];
      if (status !== expected) fail(`${locale}/${id}.md must declare roadmap_status: ${expected}.`);
    }
    for (const match of content.matchAll(/\]\(([^)#]+\.md)(?:#[^)]*)?\)/g)) {
      if (/^[a-z]+:/i.test(match[1])) continue;
      if (!fs.existsSync(path.resolve(path.dirname(file), match[1]))) {
        fail(`${locale}/${id}.md has a missing relative document: ${match[1]}`);
      }
    }
  }
}
if (!process.exitCode) console.log(`Current docs contract passed: ${requiredIds.length} navigation IDs in both locales.`);
