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

package org.apache.hertzbeat.manager.setup.installation;

import java.util.Optional;

/** Pure startup decision boundary; unreachable configured persistence can never become setup. */
public final class InstallationClassifier {
    public InstallationMode classify(DatabasePresence database, Optional<InstallationRecord> record,
                                     Optional<InstallationFingerprint> localFingerprint) {
        if (database == DatabasePresence.UNREACHABLE) {
            return InstallationMode.RECOVERY;
        }
        if (database == DatabasePresence.EMPTY) {
            return localFingerprint.isEmpty() ? InstallationMode.SETUP : InstallationMode.RECOVERY;
        }
        if (record.isEmpty()) {
            return InstallationMode.UPGRADE;
        }
        InstallationRecord installed = record.orElseThrow();
        if (!installed.complete() || localFingerprint.isEmpty()
                || !installed.fingerprint().equals(localFingerprint.orElseThrow().value())) {
            return InstallationMode.RECOVERY;
        }
        return InstallationMode.FULL;
    }
}
