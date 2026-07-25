/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export function authoritativePageIndexCorrection(pageIndex: number, totalPages: number) {
  if (pageIndex === 0) return undefined;
  const lastPageIndex = Math.max(0, totalPages - 1);
  return pageIndex > lastPageIndex ? lastPageIndex : undefined;
}
