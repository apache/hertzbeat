/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type MatchableDomElement = HTMLElement | SVGElement;

export function requireDomElement(element: Element | null | undefined, description: string): MatchableDomElement {
  if (element instanceof HTMLElement || element instanceof SVGElement) return element;
  throw new Error(`${description} was not rendered.`);
}
