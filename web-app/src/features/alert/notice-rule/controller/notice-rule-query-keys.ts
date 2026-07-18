/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export const noticeRuleQueryKeys = {
  receiverOptions: () => ['notice-receivers', 'all'] as const,
  templateOptions: () => ['notice-templates', 'all'] as const
};
