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

import java.io.IOException;
import java.nio.file.Path;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFileLock;

/** Shared lock boundary for every writer of the managed configuration pair. */
final class ManagedConfigurationLock {

    static final String LOCK_FILE_NAME = ".managed-config-v2.lock";

    private static final String LOCK_FILE = "data/config/" + LOCK_FILE_NAME;

    private final SecureSetupFileLock delegate;

    ManagedConfigurationLock(Path installationRoot) {
        delegate = new SecureSetupFileLock(installationRoot, LOCK_FILE);
    }

    <T> T execute(SecureSetupFileLock.IoOperation<T> operation) throws IOException {
        return delegate.execute(operation);
    }
}
