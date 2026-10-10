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

package org.apache.hertzbeat.startup.runtime;

import java.io.IOException;
import java.nio.file.Path;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;

/** Resolves and canonicalizes the official standalone installation root exactly once. */
public final class StartupInstallationRootResolver {

    private static final String ROOT_ENVIRONMENT = "HERTZBEAT_INTERNAL_INSTALLATION_ROOT";

    ResolvedStartupInstallationRoot resolve(String[] args) {
        String configured = StartupArgumentProperties.resolve(args, SetupInstallationPaths.ROOT_PROPERTY,
                System.getProperty(SetupInstallationPaths.ROOT_PROPERTY), System.getenv(ROOT_ENVIRONMENT));
        Path declared = Path.of(configured == null ? "." : configured).toAbsolutePath().normalize();
        try {
            return new ResolvedStartupInstallationRoot(declared, SecureSetupFile.prepareTrustedRoot(declared));
        } catch (IOException | RuntimeException exception) {
            throw StandaloneDeploymentOwnerException.unavailable();
        }
    }
}
