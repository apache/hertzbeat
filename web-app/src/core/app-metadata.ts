/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import packageMetadata from '../../package.json';

export const appMetadata = {
  name: 'HertzBeat',
  version: packageMetadata.version,
  website: 'https://hertzbeat.apache.org/',
  documentation: 'https://hertzbeat.apache.org/docs/',
  repository: 'https://github.com/apache/hertzbeat',
  issues: 'https://github.com/apache/hertzbeat/issues'
} as const;
