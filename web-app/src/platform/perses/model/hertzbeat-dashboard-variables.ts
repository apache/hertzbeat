/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from 'zod';

import { dashboardPlainTextSchema } from './hertzbeat-dashboard-text';

const variableName = z.enum(['serviceName', 'serviceNamespace', 'environment']);
const variableValue = dashboardPlainTextSchema
  .min(1)
  .max(256)
  .refine(value => value.trim() === value);
const textVariable = z
  .object({
    kind: z.literal('TextVariable'),
    spec: z
      .object({
        name: variableName,
        value: dashboardPlainTextSchema.max(256).refine(value => value.trim() === value)
      })
      .strict()
  })
  .strict();
const listVariable = z
  .object({
    kind: z.literal('ListVariable'),
    spec: z
      .object({
        name: variableName,
        defaultValue: variableValue,
        allowMultiple: z.literal(false),
        allowAllValue: z.literal(false),
        plugin: z
          .object({
            kind: z.literal('StaticListVariable'),
            spec: z
              .object({
                values: z
                  .array(variableValue)
                  .min(1)
                  .max(100)
                  .refine(values => new Set(values).size === values.length)
              })
              .strict()
          })
          .strict()
      })
      .strict()
  })
  .strict()
  .refine(variable => variable.spec.plugin.spec.values.includes(variable.spec.defaultValue));

export const dashboardVariablesSchema = z
  .array(z.union([textVariable, listVariable]))
  .max(3)
  .refine(variables => new Set(variables.map(variable => variable.spec.name)).size === variables.length);
