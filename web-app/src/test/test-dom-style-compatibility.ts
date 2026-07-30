/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export function installTestDomStyleCompatibility(target: Window) {
  const getComputedStyle = target.getComputedStyle.bind(target);
  Object.defineProperty(target, 'getComputedStyle', {
    configurable: true,
    writable: true,
    // jsdom does not implement pseudo-element style probes used by UI libraries.
    // Forward the real element lookup while omitting only that unsupported argument.
    value: (element: Element) => getComputedStyle(element)
  });
}
