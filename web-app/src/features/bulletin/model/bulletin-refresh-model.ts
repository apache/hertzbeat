/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export const defaultBulletinRefreshSeconds = 30 as const;
export const bulletinRefreshChoices = [10, 30, 60, 300, 0] as const;
export type BulletinRefreshChoice = (typeof bulletinRefreshChoices)[number];
export type BulletinRefreshSeconds = typeof defaultBulletinRefreshSeconds | BulletinRefreshChoice;

export function bulletinRefreshInterval(value: BulletinRefreshSeconds) {
  return value === 0 ? false : value * 1_000;
}

export function isBulletinRefreshChoice(value: unknown): value is BulletinRefreshChoice {
  return bulletinRefreshChoices.includes(value as BulletinRefreshChoice);
}
