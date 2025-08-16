/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Label } from '../../pojo/Label';

export function formatLabelName(label: Label): string {
  if (label.tagValue != undefined && label.tagValue.trim() != '') {
    return `${label.name}:${label.tagValue}`;
  } else {
    return label.name;
  }
}

const colors = ['blue', 'green', 'orange', 'purple', 'cyan', 'yellow', 'pink', 'lime', 'red', 'geekblue', 'volcano', 'magenta'];
export function renderLabelColor(key: string): string {
  // Hash the key to get a consistent index
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function findDeepestSelected(nodes: any): any {
  let deepestSelectedNode = null;
  for (let node of nodes) {
    if (node._selected && (!node.children || node.children.length === 0)) {
      return node;
    }

    if (node.children) {
      const selectedChild = findDeepestSelected(node.children);
      if (selectedChild) {
        deepestSelectedNode = selectedChild;
      }
    }
  }
  return deepestSelectedNode;
}

export function generateReadableRandomString(): string {
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
  ];

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
  ];

  const digits = '23456789';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz';

  // Randomly select an adjective and a noun
  let adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  let noun = nouns[Math.floor(Math.random() * nouns.length)];

  // Randomly generate a sequence of numbers and characters
  const randomDigits = Array.from({ length: 2 }, () => digits.charAt(Math.floor(Math.random() * digits.length))).join('');

  const randomChars = Array.from({ length: 2 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  adjective = capitalizeFirstLetter(adjective);
  noun = capitalizeFirstLetter(noun);
  // Combine the parts to form the final string
  return `${adjective}_${noun}_${randomDigits}${randomChars}`;
}

function capitalizeFirstLetter(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
