/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

/** Canonical page evidence after a feature API has validated its wire response. */
export type PagedCollection<Item> = {
  content: Item[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};
