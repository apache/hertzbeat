import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

const requiredFiles = [
  'home/docs/roadmap/index.md',
  'home/docs/roadmap/datadog-directory-map.md',
  'home/docs/roadmap/future-observability-pipelines.md',
  'home/docs/roadmap/future-collector-fleet-governance.md',
  'home/docs/roadmap/future-resource-catalog.md',
  'home/docs/roadmap/future-software-catalog.md',
  'home/docs/roadmap/future-application-performance.md',
  'home/docs/roadmap/future-incident-response.md',
  'home/docs/roadmap/future-topology-fault-analysis.md',
  'home/docs/roadmap/future-automation-action-catalog.md',
  'home/docs/roadmap/future-platform-governance.md',
  'home/docs/roadmap/future-security.md',
  'home/docs/roadmap/future-data-observability.md',
  'home/docs/roadmap/future-digital-experience.md',
  'home/docs/roadmap/future-software-delivery.md',
  'home/docs/roadmap/future-cloud-cost.md',
  'home/docs/roadmap/future-ai-observability.md',
  'home/docs/roadmap/future-developer-integrations.md'
];

const requiredRoadmapPhrases = [
  'Roadmap status',
  'Current status',
  'Planned capability',
  'Contribution entry',
  'Non-goals'
];

const requiredDirectoryMapPhrases = [
  'Datadog docs area',
  'HertzBeat current coverage',
  'Roadmap document',
  'Open-source private deployment note'
];

const requiredProgressPhrases = [
  'HertzBeat platform roadmap against Datadog docs directory',
  'Roadmap milestones:',
  'Roadmap 文档骨架与能力对照',
  'Datadog 只作为能力清单参考'
];

const fail = message => {
  console.error(message);
  process.exitCode = 1;
};

for (const file of requiredFiles) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing roadmap file: ${file}`);
    continue;
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  if (file.endsWith('datadog-directory-map.md')) {
    for (const phrase of requiredDirectoryMapPhrases) {
      if (!content.includes(phrase)) {
        fail(`${file} is missing directory-map phrase: ${phrase}`);
      }
    }
  } else if (file.includes('/future-')) {
    for (const phrase of requiredRoadmapPhrases) {
      if (!content.includes(phrase)) {
        fail(`${file} is missing roadmap phrase: ${phrase}`);
      }
    }
  }
}

const sidebars = fs.readFileSync(path.join(repoRoot, 'home/sidebars.json'), 'utf8');
if (!sidebars.includes('"label": "Roadmap"')) {
  fail('home/sidebars.json must expose a Roadmap category.');
}
for (const file of requiredFiles) {
  const docId = file.replace('home/docs/', '').replace(/\.md$/, '');
  if (!sidebars.includes(`"${docId}"`)) {
    fail(`home/sidebars.json must include ${docId}.`);
  }
}

const progress = fs.readFileSync(path.join(repoRoot, 'progress.md'), 'utf8');
for (const phrase of requiredProgressPhrases) {
  if (!progress.includes(phrase)) {
    fail(`progress.md is missing roadmap phrase: ${phrase}`);
  }
}

if (process.exitCode) {
  process.exit();
}

console.log('Roadmap docs contract passed.');
