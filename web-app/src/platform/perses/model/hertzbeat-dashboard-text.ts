/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';

export const dashboardPlainTextSchema = z.string().refine(value => !value.includes('${') && !value.includes('$__'));
