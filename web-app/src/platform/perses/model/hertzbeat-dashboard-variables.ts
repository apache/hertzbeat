/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
