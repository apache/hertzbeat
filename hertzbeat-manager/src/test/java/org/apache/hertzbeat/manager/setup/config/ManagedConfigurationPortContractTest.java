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

package org.apache.hertzbeat.manager.setup.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.io.IOException;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;

class ManagedConfigurationPortContractTest {

    private static final String SECRET = "managed-secret-value";

    @Test
    void keepsApplicationAndSecretConfigurationInSeparateTypedPorts() throws Exception {
        RecordingApplicationStore applicationStore = new RecordingApplicationStore();
        RecordingSecretStore secretStore = new RecordingSecretStore();
        ManagedApplicationConfig application = configuration();
        ManagedSecrets secrets = ManagedSecrets.withTelemetryPassword(
                SecretValue.of(SECRET), SecretValue.of(SECRET));

        applicationStore.stageCandidate(application, "port-contract-generation");
        secretStore.stageCandidate(secrets, "port-contract-generation");

        assertEquals(application, applicationStore.readCandidate().value().orElseThrow());
        assertEquals(secrets, secretStore.readCandidate().value().orElseThrow());
    }

    @Test
    void secretValuesNeverRenderTheirContent() {
        SecretValue password = SecretValue.of(SECRET);
        ManagedSecrets secrets = ManagedSecrets.withTelemetryPassword(password, password);

        assertFalse(password.toString().contains(SECRET));
        assertFalse(secrets.toString().contains(SECRET));
    }

    @Test
    void candidateReadClassifiesRecoveryWithoutExceptionsOrRawDocuments() {
        ManagedApplicationConfig config = configuration();

        assertEquals(config, CandidateRead.valid(config, "contract-generation").value().orElseThrow());
        assertEquals(CandidateState.VALID, CandidateRead.valid(config, "contract-generation").state());
        assertEquals(Optional.empty(), CandidateRead.<ManagedApplicationConfig>corrupt().value());
        assertEquals(Optional.empty(), CandidateRead.<ManagedApplicationConfig>invalid().value());
        assertEquals(Optional.empty(), CandidateRead.<ManagedApplicationConfig>unreadable().value());
        assertEquals(CandidateState.MISSING, CandidateRead.<ManagedApplicationConfig>missing().state());
    }

    private static ManagedApplicationConfig configuration() {
        return new ManagedApplicationConfig(
                new MetadataDatabaseSettings(
                        MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db/hertzbeat", "hertzbeat"),
                GreptimeSettings.authenticated(
                        new GreptimeEndpoints("greptime:4001", "http://greptime:4000"), "public", "hertzbeat"));
    }

    private static final class RecordingApplicationStore implements ManagedApplicationConfigStore {

        private ManagedApplicationConfig candidate;
        private String generation;

        @Override
        public CandidateRead<ManagedApplicationConfig> readCandidate() {
            return candidate == null ? CandidateRead.missing() : CandidateRead.valid(candidate, generation);
        }

        @Override
        public CandidateRead<ManagedApplicationConfig> readLastKnownGood() {
            return CandidateRead.missing();
        }

        @Override
        public CandidateRead<ManagedApplicationConfig> readActive() {
            return CandidateRead.missing();
        }

        @Override
        public void stageCandidate(ManagedApplicationConfig candidate, String generation) {
            this.candidate = candidate;
            this.generation = generation;
        }

        @Override
        public void promoteCandidate(ManagedApplicationConfig expected, String generation) {
        }

        @Override
        public void restoreActive(CandidateRead<ManagedApplicationConfig> previous) {
            candidate = previous.value().orElse(null);
            generation = previous.generation().orElse(null);
        }

        @Override
        public void discardCandidate() {
            candidate = null;
            generation = null;
        }
    }

    private static final class RecordingSecretStore implements ManagedSecretStore {

        private ManagedSecrets candidate;
        private String generation;

        @Override
        public CandidateRead<ManagedSecrets> readCandidate() {
            return candidate == null ? CandidateRead.missing() : CandidateRead.valid(candidate, generation);
        }

        @Override
        public CandidateRead<ManagedSecrets> readLastKnownGood() {
            return CandidateRead.missing();
        }

        @Override
        public CandidateRead<ManagedSecrets> readActive() {
            return CandidateRead.missing();
        }

        @Override
        public void stageCandidate(ManagedSecrets candidate, String generation) throws IOException {
            this.candidate = candidate;
            this.generation = generation;
        }

        @Override
        public void promoteCandidate(ManagedSecrets expected, String generation) {
        }

        @Override
        public void restoreActive(CandidateRead<ManagedSecrets> previous) {
            candidate = previous.value().orElse(null);
            generation = previous.generation().orElse(null);
        }

        @Override
        public void discardCandidate() {
            candidate = null;
            generation = null;
        }
    }
}
