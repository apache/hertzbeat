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

import java.io.IOException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.installation.InstallationCompletionService;
import org.apache.hertzbeat.manager.setup.installation.InstallationFingerprint;
import org.apache.hertzbeat.manager.setup.installation.LocalInstallationFingerprintStore;
import org.springframework.http.HttpStatus;

/** Commits installation closure and schedules the context transition off the request thread. */
public final class SetupCompletionCoordinator {
    private final LocalInstallationFingerprintStore fingerprints;
    private final InstallationCompletionService installations;

    public SetupCompletionCoordinator(LocalInstallationFingerprintStore fingerprints,
                                      InstallationCompletionService installations) {
        this.fingerprints = fingerprints;
        this.installations = installations;
    }

    public void completeInstallation() {
        InstallationFingerprint fingerprint;
        try {
            fingerprint = fingerprints.read().orElseGet(this::createFingerprint);
        } catch (IOException failure) {
            throw new SetupApiException(SetupErrorCode.CONFIG_WRITE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        installations.complete(fingerprint);
    }

    private InstallationFingerprint createFingerprint() {
        try {
            return fingerprints.create();
        } catch (IOException failure) {
            try {
                return fingerprints.read().orElseThrow(() -> failure);
            } catch (IOException readFailure) {
                throw new SetupApiException(SetupErrorCode.CONFIG_WRITE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
    }
}
