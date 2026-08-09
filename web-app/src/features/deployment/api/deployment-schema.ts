/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import {
  DEPLOYMENT_ERROR_CODES,
  DEPLOYMENT_MAINTENANCE_MODES,
  DEPLOYMENT_TOPOLOGIES,
  MAINTENANCE_ADMISSIONS,
  MIGRATION_STAGES,
  MIGRATION_STATES,
  MIGRATION_TARGETS,
  MIGRATION_VERIFICATION_STATES,
  type DeploymentView,
  type MigrationView,
  type ValidationResponse
} from '../model/deployment-contract';
import { isDeploymentOperationId } from '../model/deployment-route';
import {
  deploymentCapabilityValid,
  migrationLifecycleValid,
  migrationValidationValid
} from './deployment-contract-invariants';

const metadataDatabaseKinds = ['h2', 'mysql', 'postgresql'] as const;
const applyModes = ['managed_write', 'external_apply'] as const;
const configSources = [
  'built_in_default',
  'ui_managed',
  'external_file',
  'environment',
  'system_property',
  'command_line'
] as const;
const validationWarnings = [
  'external_apply_required',
  'restart_required',
  'public_address_plaintext',
  'mail_security_none',
  'h2_non_production'
] as const;

const instant = z.string().datetime({ offset: true });
const errorCode = z.enum(DEPLOYMENT_ERROR_CODES);
const databaseSummary = z
  .object({
    kind: z.enum(metadataDatabaseKinds).nullable(),
    configured: z.boolean(),
    source: z.enum(configSources),
    restartRequired: z.boolean()
  })
  .strict();

const deploymentSchema = z
  .object({
    observedAt: instant,
    managementDatabase: databaseSummary,
    greptimeDatabase: databaseSummary.extend({ kind: z.literal('greptime') }).strict(),
    applyMode: z.enum(applyModes),
    maintenanceMode: z.enum(DEPLOYMENT_MAINTENANCE_MODES),
    topology: z.enum(DEPLOYMENT_TOPOLOGIES),
    migration: z
      .object({
        allowed: z.boolean(),
        blockedBy: errorCode.nullable(),
        maintenanceAdmission: z.enum(MAINTENANCE_ADMISSIONS),
        activeOperationId: z.string().refine(isDeploymentOperationId).nullable()
      })
      .strict()
  })
  .strict()
  .superRefine(validateDeployment);

const migrationSchema = z
  .object({
    operationId: z.string().refine(isDeploymentOperationId),
    state: z.enum(MIGRATION_STATES),
    source: z.literal('h2'),
    target: z.enum(MIGRATION_TARGETS),
    stage: z.enum(MIGRATION_STAGES),
    progressPercent: z.number().int().min(0).max(100),
    createdAt: instant,
    startedAt: instant.nullable(),
    completedAt: instant.nullable(),
    verificationState: z.enum(MIGRATION_VERIFICATION_STATES),
    errorCode: errorCode.nullable(),
    nextPollAfterMillis: z.number().int().nonnegative(),
    activationAvailable: z.boolean(),
    restartRequired: z.boolean(),
    externalApplyRequired: z.boolean()
  })
  .strict()
  .superRefine(validateMigration);

const validationSchema = z
  .object({
    valid: z.boolean(),
    observedAt: instant,
    errorCode: errorCode.nullable(),
    warnings: z.array(z.enum(validationWarnings))
  })
  .strict()
  .superRefine(validateValidation);

class DeploymentContractError extends Error {
  constructor() {
    super('Deployment response was invalid');
    this.name = 'DeploymentContractError';
  }
}

export function parseDeploymentView(value: unknown): DeploymentView {
  return parse(deploymentSchema, value);
}

export function parseMigrationView(value: unknown): MigrationView {
  return parse(migrationSchema, value);
}

export function parseMigrationValidation(value: unknown): ValidationResponse {
  return parse(validationSchema, value);
}

function validateDeployment(value: z.infer<typeof deploymentSchema>, context: z.RefinementCtx) {
  if (!deploymentCapabilityValid(value)) {
    context.addIssue({ code: 'custom', message: 'Inconsistent migration capability' });
  }
}

function validateMigration(value: z.infer<typeof migrationSchema>, context: z.RefinementCtx) {
  if (!migrationLifecycleValid(value)) {
    context.addIssue({ code: 'custom', message: 'Inconsistent migration lifecycle' });
  }
}

function validateValidation(value: z.infer<typeof validationSchema>, context: z.RefinementCtx) {
  if (!migrationValidationValid(value)) {
    context.addIssue({ code: 'custom', message: 'Inconsistent migration validation outcome' });
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new DeploymentContractError();
  return result.data;
}
