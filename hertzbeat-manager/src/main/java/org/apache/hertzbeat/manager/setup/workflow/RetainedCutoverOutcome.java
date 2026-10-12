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

package org.apache.hertzbeat.manager.setup.workflow;

import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;

/** Completed secret-free cutover result retained while exact cleanup is pending. */
final class RetainedCutoverOutcome {

    private final RuntimeException stableFailure;
    private final Error fatal;

    private RetainedCutoverOutcome(RuntimeException stableFailure, Error fatal) {
        this.stableFailure = stableFailure;
        this.fatal = fatal;
    }

    static RetainedCutoverOutcome success() {
        return new RetainedCutoverOutcome(null, null);
    }

    static RetainedCutoverOutcome retryExecution() {
        return stable(new RetainedCutoverException(
                RetainedCutoverErrorCode.PREPARATION_RETRY_REQUIRED));
    }

    static RetainedCutoverOutcome identityChanged() {
        return stable(new RetainedCutoverException(
                RetainedCutoverErrorCode.TARGET_IDENTITY_CHANGED));
    }

    static RetainedCutoverOutcome factoryClosed() {
        return stable(new TargetJdbcConnectionException(
                TargetJdbcConnectionErrorCode.FACTORY_CLOSED));
    }

    static RetainedCutoverOutcome failure(Throwable failure) {
        if (failure instanceof Error error) {
            return new RetainedCutoverOutcome(null, error);
        }
        if (failure instanceof MetadataMigrationException
                || failure instanceof TargetJdbcConnectionException
                || failure instanceof TargetSchemaProvisioningException
                || failure instanceof MigrationMaintenanceException
                || failure instanceof DurableCutoverPreparationException
                || failure instanceof RetainedCopyJournalHandoffException
                || failure instanceof RetainedCutoverException) {
            return stable((RuntimeException) failure);
        }
        return stable(new RetainedCutoverException(RetainedCutoverErrorCode.EXECUTION_FAILED));
    }

    boolean successful() {
        return stableFailure == null && fatal == null;
    }

    RetainedCutoverOutcome terminalFactoryClosedUnlessFatal() {
        return fatal == null ? factoryClosed() : this;
    }

    void replay() {
        if (fatal != null) {
            throw fatal;
        }
        if (stableFailure != null) {
            throw stableFailure;
        }
    }

    void releaseRequired() {
        if (fatal != null) {
            RetainedCutoverReleaseRequiredException.attach(fatal);
            throw fatal;
        }
        throw new RetainedCutoverReleaseRequiredException();
    }

    void releaseFatal(Error releaseFatal) {
        if (fatal != null) {
            releaseRequired();
        }
        RetainedCutoverReleaseRequiredException.attach(releaseFatal);
        throw releaseFatal;
    }

    private static RetainedCutoverOutcome stable(RuntimeException failure) {
        return new RetainedCutoverOutcome(failure, null);
    }
}
