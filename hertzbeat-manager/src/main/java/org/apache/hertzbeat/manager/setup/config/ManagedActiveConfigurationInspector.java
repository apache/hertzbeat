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

import java.nio.file.Path;
import java.util.Map;
import java.util.Objects;

/** Reads, verifies, and materializes the active pair exactly once for startup consumption. */
public final class ManagedActiveConfigurationInspector {

    public static final String MANAGED_APPLICATION_SOURCE = "hertzbeatManagedApplication";
    public static final String MANAGED_SECRET_SOURCE = "hertzbeatManagedSecrets";

    private final ManagedApplicationConfigStore applicationStore;
    private final ManagedSecretStore secretStore;

    public ManagedActiveConfigurationInspector(Path installationRoot) {
        this(new FileManagedApplicationConfigStore(installationRoot),
                new FileManagedSecretStore(installationRoot));
    }

    ManagedActiveConfigurationInspector(
            ManagedApplicationConfigStore applicationStore, ManagedSecretStore secretStore) {
        this.applicationStore = Objects.requireNonNull(applicationStore, "applicationStore");
        this.secretStore = Objects.requireNonNull(secretStore, "secretStore");
    }

    public Inspection inspect() {
        CandidateRead<ManagedApplicationConfig> application = applicationStore.readActive();
        CandidateRead<ManagedSecrets> secrets = secretStore.readActive();
        try {
            if (application.state() == CandidateState.MISSING && secrets.state() == CandidateState.MISSING) {
                return Inspection.absent();
            }
            if (application.state() != CandidateState.VALID
                    || secrets.state() != CandidateState.VALID
                    || !application.generation().equals(secrets.generation())) {
                return Inspection.recoveryRequired();
            }
            ManagedConfigurationBundle bundle = new ManagedConfigurationBundle(
                    application.value().orElseThrow(), secrets.value().orElseThrow());
            return Inspection.loadable(
                    ApplicationConfigDocumentCodec.springProperties(bundle.application()),
                    SecretConfigDocumentCodec.springProperties(bundle.secrets()));
        } catch (IllegalArgumentException failure) {
            return Inspection.recoveryRequired();
        } finally {
            ManagedConfigurationTransaction.close(secrets);
        }
    }

    /** Immutable verified startup material; its string form never renders property values. */
    public record Inspection(
            State state,
            Map<String, Object> applicationProperties,
            Map<String, Object> secretProperties) {

        public Inspection {
            Objects.requireNonNull(state, "state");
            applicationProperties = Map.copyOf(applicationProperties);
            secretProperties = Map.copyOf(secretProperties);
            if (state != State.LOADABLE
                    && (!applicationProperties.isEmpty() || !secretProperties.isEmpty())) {
                throw new IllegalArgumentException("Only loadable inspection may contain properties");
            }
        }

        private static Inspection absent() {
            return empty(State.ABSENT);
        }

        private static Inspection recoveryRequired() {
            return empty(State.RECOVERY_REQUIRED);
        }

        private static Inspection loadable(
                Map<String, Object> applicationProperties,
                Map<String, Object> secretProperties) {
            return new Inspection(State.LOADABLE, applicationProperties, secretProperties);
        }

        private static Inspection empty(State state) {
            return new Inspection(state, Map.of(), Map.of());
        }

        @Override
        public String toString() {
            return "Inspection[state=" + state + "]";
        }
    }

    /** Startup-safe classification without exposing configuration or failure details. */
    public enum State {
        ABSENT,
        LOADABLE,
        RECOVERY_REQUIRED
    }
}
