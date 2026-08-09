/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { DeploymentErrorCode, ValidationResponse } from '../model/deployment-contract';
import { parseDeploymentView, parseMigrationValidation, parseMigrationView } from './deployment-schema';

const deployment = {
  observedAt: '2026-08-09T01:00:00Z',
  managementDatabase: { kind: 'h2', configured: true, source: 'ui_managed', restartRequired: false },
  greptimeDatabase: { kind: 'greptime', configured: true, source: 'environment', restartRequired: false },
  applyMode: 'managed_write',
  maintenanceMode: 'active',
  topology: 'single_node',
  migration: { allowed: true, blockedBy: null, maintenanceAdmission: 'use_current', activeOperationId: null }
} as const;

const pending = {
  operationId: 'migration-1',
  state: 'pending',
  source: 'h2',
  target: 'mysql',
  stage: 'queued',
  progressPercent: 0,
  createdAt: '2026-08-09T01:00:00Z',
  startedAt: null,
  completedAt: null,
  verificationState: 'pending',
  errorCode: null,
  nextPollAfterMillis: 750,
  activationAvailable: false,
  restartRequired: false,
  externalApplyRequired: false
} as const;

describe('deployment response contracts', () => {
  it('accepts a structurally consistent deployment and pending operation', () => {
    expect(parseDeploymentView(deployment)).toEqual(deployment);
    expect(
      parseDeploymentView({
        ...deployment,
        managementDatabase: { ...deployment.managementDatabase, kind: null },
        migration: {
          allowed: false,
          blockedBy: 'migration_source_unsupported',
          maintenanceAdmission: 'not_applicable',
          activeOperationId: null
        }
      })
    ).toMatchObject({ managementDatabase: { kind: null } });
    expect(parseMigrationView(pending)).toEqual(pending);
  });

  it('accepts server-owned automatic maintenance admission for a fresh inactive H2 deployment', () => {
    expect(
      parseDeploymentView({
        ...deployment,
        maintenanceMode: 'inactive',
        migration: { allowed: true, blockedBy: null, maintenanceAdmission: 'auto_enter', activeOperationId: null }
      })
    ).toMatchObject({ maintenanceMode: 'inactive', migration: { maintenanceAdmission: 'auto_enter' } });
  });

  it('accepts only an operation conflict as durable active-operation discovery', () => {
    expect(
      parseDeploymentView({
        ...deployment,
        migration: {
          allowed: false,
          blockedBy: 'operation_conflict',
          maintenanceAdmission: 'unavailable',
          activeOperationId: 'migration-current_1'
        }
      })
    ).toMatchObject({ migration: { activeOperationId: 'migration-current_1' } });
  });

  it('accepts engine unavailability without inventing a maintenance transition', () => {
    expect(
      parseDeploymentView({
        ...deployment,
        migration: {
          allowed: false,
          blockedBy: 'migration_unavailable',
          maintenanceAdmission: 'unavailable',
          activeOperationId: null
        }
      })
    ).toMatchObject({ migration: { blockedBy: 'migration_unavailable', activeOperationId: null } });
  });

  it.each([
    [
      'allowed migration with a blocker',
      {
        ...deployment,
        migration: {
          allowed: true,
          blockedBy: 'migration_maintenance_required',
          maintenanceAdmission: 'unavailable',
          activeOperationId: null
        }
      }
    ],
    ['inactive maintenance with current admission', { ...deployment, maintenanceMode: 'inactive' }],
    [
      'active maintenance with automatic admission',
      {
        ...deployment,
        migration: { allowed: true, blockedBy: null, maintenanceAdmission: 'auto_enter', activeOperationId: null }
      }
    ],
    [
      'active operation without a conflict',
      { ...deployment, migration: { ...deployment.migration, activeOperationId: 'migration-current' } }
    ],
    [
      'conflict without an active operation',
      {
        ...deployment,
        migration: {
          allowed: false,
          blockedBy: 'operation_conflict',
          maintenanceAdmission: 'unavailable',
          activeOperationId: null
        }
      }
    ],
    [
      'unsafe active operation identity',
      {
        ...deployment,
        migration: {
          allowed: false,
          blockedBy: 'operation_conflict',
          maintenanceAdmission: 'unavailable',
          activeOperationId: '../../secret'
        }
      }
    ],
    [
      'conflict with a structural admission',
      {
        ...deployment,
        migration: {
          allowed: false,
          blockedBy: 'operation_conflict',
          maintenanceAdmission: 'not_applicable',
          activeOperationId: 'migration-current'
        }
      }
    ],
    [
      'engine unavailable with a structural admission',
      {
        ...deployment,
        migration: {
          allowed: false,
          blockedBy: 'migration_unavailable',
          maintenanceAdmission: 'not_applicable',
          activeOperationId: null
        }
      }
    ],
    [
      'engine unavailable with an active operation',
      {
        ...deployment,
        migration: {
          allowed: false,
          blockedBy: 'migration_unavailable',
          maintenanceAdmission: 'unavailable',
          activeOperationId: 'migration-current'
        }
      }
    ],
    ['multi-node deployment with the wrong blocker', { ...deployment, topology: 'multi_node' }],
    [
      'external management database marked migratable',
      {
        ...deployment,
        managementDatabase: { ...deployment.managementDatabase, kind: 'mysql' }
      }
    ]
  ])('rejects impossible deployment state: %s', (_label, value) => {
    expect(() => parseDeploymentView(value)).toThrowError('Deployment response was invalid');
  });

  it.each([
    ['pending without polling', { ...pending, nextPollAfterMillis: 0 }],
    ['URL-unsafe operation identity', { ...pending, operationId: '../../unsafe' }],
    ['pending with a started timestamp', { ...pending, startedAt: pending.createdAt }],
    [
      'ready without activation',
      {
        ...pending,
        state: 'ready_to_activate',
        stage: 'ready_to_activate',
        progressPercent: 100,
        startedAt: pending.createdAt,
        verificationState: 'succeeded',
        nextPollAfterMillis: 0
      }
    ],
    [
      'external apply with activation',
      {
        ...pending,
        state: 'awaiting_external_apply',
        stage: 'awaiting_external_apply',
        progressPercent: 100,
        startedAt: pending.createdAt,
        verificationState: 'succeeded',
        nextPollAfterMillis: 0,
        activationAvailable: true,
        externalApplyRequired: true
      }
    ],
    [
      'failed without a stable operation error',
      {
        ...pending,
        state: 'failed',
        stage: 'failed',
        startedAt: pending.createdAt,
        completedAt: pending.createdAt,
        nextPollAfterMillis: 0
      }
    ]
  ])('rejects impossible migration state: %s', (_label, value) => {
    expect(() => parseMigrationView(value)).toThrowError('Deployment response was invalid');
  });

  it('rejects unknown fields so secret-bearing server output cannot be ignored', () => {
    expect(() => parseMigrationView({ ...pending, password: 'server-secret' })).toThrowError(
      'Deployment response was invalid'
    );
  });

  it('accepts only validation outcomes whose stable error matches validity', () => {
    expect(parseMigrationValidation(validationFixture(true, null))).toMatchObject({ valid: true, errorCode: null });
    expect(parseMigrationValidation(validationFixture(false, 'metadata_connection_failed'))).toMatchObject({
      valid: false,
      errorCode: 'metadata_connection_failed'
    });
    const deploymentValidation: ValidationResponse = parseMigrationValidation(
      validationFixture(false, 'migration_maintenance_required')
    );
    expect(deploymentValidation.errorCode).toBe('migration_maintenance_required');
    expect(() => parseMigrationValidation(validationFixture(true, 'metadata_connection_failed'))).toThrowError(
      'Deployment response was invalid'
    );
    expect(() => parseMigrationValidation(validationFixture(false, null))).toThrowError(
      'Deployment response was invalid'
    );
  });
});

function validationFixture(valid: boolean, errorCode: DeploymentErrorCode | null) {
  return { valid, observedAt: '2026-08-09T01:00:00Z', errorCode, warnings: [] };
}
