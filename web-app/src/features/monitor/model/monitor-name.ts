/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

const adjectives = [
  'quick',
  'bright',
  'calm',
  'brave',
  'cool',
  'eager',
  'fancy',
  'gentle',
  'happy',
  'jolly',
  'kind',
  'lively',
  'merry',
  'nice',
  'proud',
  'witty',
  'zesty',
  'nifty',
  'quirky',
  'unique',
  'vivid',
  'zany',
  'zealous',
  'yummy',
  'agile',
  'bold',
  'daring',
  'fearless',
  'gleeful',
  'humble',
  'jumpy',
  'keen',
  'loyal',
  'majestic',
  'noble',
  'playful',
  'radiant',
  'spirited',
  'tenacious',
  'vibrant',
  'wise',
  'youthful',
  'zippy',
  'serene',
  'bubbly',
  'dreamy',
  'fierce',
  'graceful'
] as const;

const nouns = [
  'fox',
  'lion',
  'eagle',
  'shark',
  'whale',
  'falcon',
  'panda',
  'tiger',
  'wolf',
  'otter',
  'lynx',
  'moose',
  'dolphin',
  'bear',
  'hawk',
  'zebra',
  'giraffe',
  'koala',
  'lemur',
  'lemming',
  'cheetah',
  'dragon',
  'owl',
  'rhino',
  'stingray',
  'jaguar',
  'panther',
  'elk',
  'ocelot',
  'beaver',
  'walrus',
  'gazelle',
  'coyote',
  'vulture',
  'iguana',
  'porcupine',
  'raccoon',
  'sloth',
  'armadillo',
  'chameleon',
  'kestrel',
  'weasel',
  'hedgehog'
] as const;

const digits = '23456789';
const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz';

/** Preserves the readable, ambiguity-free task-name format used by the Angular editor. */
export function createReadableMonitorName(random: () => number = Math.random) {
  const adjective = capitalize(pick(adjectives, random));
  const noun = capitalize(pick(nouns, random));
  const suffix = `${pickString(digits, random)}${pickString(digits, random)}${pickString(characters, random)}${pickString(characters, random)}`;
  return `${adjective}_${noun}_${suffix}`;
}

function pick<T>(values: readonly T[], random: () => number) {
  return values[Math.floor(random() * values.length)]!;
}

function pickString(values: string, random: () => number) {
  return values.charAt(Math.floor(random() * values.length));
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
