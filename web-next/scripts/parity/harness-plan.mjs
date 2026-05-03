import { resolveParityTargets } from './harness-targets.mjs';

export function buildParityRunPlan(
  manifest,
  {
    milestone,
    familyKey,
    routeKey,
    nextBaseUrl = 'http://127.0.0.1:4200',
    referenceBaseUrl = 'http://127.0.0.1:4301'
  } = {}
) {
  return resolveParityTargets(manifest, { milestone, familyKey, routeKey }).map(({ family, routePair }) => ({
    milestone: family.milestone,
    familyKey: family.key,
    familyParityOwner: family.parityOwner ?? null,
    familyVerificationCommand: family.familyVerificationCommand ?? null,
    parityOwner: routePair.parityOwner ?? family.parityOwner ?? null,
    routePairKey: routePair.key,
    nextRoute: routePair.nextRoute,
    referenceRoute: routePair.referenceRoute,
    nextPagePath: routePair.nextPagePath ?? null,
    routeTestPath: routePair.routeTestPath ?? null,
    routeParitySpec: routePair.routeParitySpec ?? null,
    nextUrl: new URL(routePair.nextRoute, nextBaseUrl).toString(),
    referenceUrl: new URL(routePair.referenceRoute, referenceBaseUrl).toString(),
    authState: routePair.authState,
    seedState: routePair.seedState,
    primarySelectors: routePair.primarySelectors,
    textSnippets: routePair.textSnippets,
    actionLabels: routePair.actionLabels,
    minimumVerificationCommand: routePair.minimumVerificationCommand
  }));
}

export function buildParityVerificationPlan(manifest, options = {}) {
  const targets = buildParityRunPlan(manifest, options);
  const verificationSteps = [];
  const verificationStepByCommand = new Map();
  const familyVerificationSteps = [];
  const familyVerificationStepByFamily = new Map();

  for (const target of targets) {
    const command = target.minimumVerificationCommand;
    if (!command) {
    } else {
      let step = verificationStepByCommand.get(command);

      if (!step) {
        step = {
          command,
          routePairKeys: [],
          routeTestPaths: []
        };
        verificationStepByCommand.set(command, step);
        verificationSteps.push(step);
      }

      if (!step.routePairKeys.includes(target.routePairKey)) {
        step.routePairKeys.push(target.routePairKey);
      }

      if (target.routeTestPath && !step.routeTestPaths.includes(target.routeTestPath)) {
        step.routeTestPaths.push(target.routeTestPath);
      }
    }

    const familyCommand = target.familyVerificationCommand;
    if (!familyCommand) {
      continue;
    }

    let familyStep = familyVerificationStepByFamily.get(target.familyKey);

    if (!familyStep) {
      familyStep = {
        familyKey: target.familyKey,
        parityOwner: target.familyParityOwner,
        command: familyCommand,
        routePairKeys: [],
        routeTestPaths: []
      };
      familyVerificationStepByFamily.set(target.familyKey, familyStep);
      familyVerificationSteps.push(familyStep);
    }

    if (!familyStep.routePairKeys.includes(target.routePairKey)) {
      familyStep.routePairKeys.push(target.routePairKey);
    }

    if (target.routeTestPath && !familyStep.routeTestPaths.includes(target.routeTestPath)) {
      familyStep.routeTestPaths.push(target.routeTestPath);
    }
  }

  return {
    targets,
    parityOwners: [...new Set(targets.map(target => target.parityOwner).filter(Boolean))],
    verificationCommands: [...new Set(targets.map(target => target.minimumVerificationCommand).filter(Boolean))],
    verificationSteps,
    familyVerificationCommands: [...new Set(targets.map(target => target.familyVerificationCommand).filter(Boolean))],
    familyVerificationSteps
  };
}
