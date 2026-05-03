export function resolveParityTargets(manifest, { milestone, familyKey, routeKey } = {}) {
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('Parity manifest is empty.');
  }

  if (routeKey && !familyKey) {
    throw new Error('A parity route key requires a family key.');
  }

  const sortedFamilies = [...manifest].sort((left, right) => left.milestone - right.milestone);

  if (familyKey) {
    const family = sortedFamilies.find(candidate => candidate.key === familyKey);
    if (!family) {
      throw new Error(`Unknown parity family: ${familyKey}`);
    }
    if (milestone != null && family.milestone !== milestone) {
      throw new Error(`Parity family ${familyKey} does not belong to milestone ${milestone}.`);
    }

    if (routeKey) {
      const routePair = family.routePairs.find(candidate => candidate.key === routeKey);
      if (!routePair) {
        throw new Error(`Unknown parity route pair: ${family.key}/${routeKey}`);
      }
      return [{ family, routePair }];
    }

    return family.routePairs.map(routePair => ({ family, routePair }));
  }

  if (milestone != null) {
    const milestoneFamilies = sortedFamilies.filter(candidate => candidate.milestone === milestone);
    if (milestoneFamilies.length === 0) {
      throw new Error(`No parity families found for milestone ${milestone}.`);
    }

    return milestoneFamilies.flatMap(family => family.routePairs.map(routePair => ({ family, routePair })));
  }

  const firstFamily = sortedFamilies[0];
  const firstPair = firstFamily?.routePairs[0];
  if (!firstFamily || !firstPair) {
    throw new Error('Parity manifest is missing a default route pair.');
  }

  return [{ family: firstFamily, routePair: firstPair }];
}
