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

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;

/** Child-JVM protocol fixture for deterministic OS owner-lock tests. */
public final class StandaloneDeploymentOwnerProcessMain {

    private StandaloneDeploymentOwnerProcessMain() {
    }

    public static void main(String[] args) throws Exception {
        StartupInstallationRootResolver resolver = new StartupInstallationRootResolver();
        try (StandaloneDeploymentOwner ignored = StandaloneDeploymentOwner.acquire(
                resolver.resolve(new String[] {"--hertzbeat.internal.installation-root=" + Path.of(args[0])}))) {
            System.out.println("LOCKED");
            System.out.flush();
            new BufferedReader(new InputStreamReader(System.in)).readLine();
        } catch (StandaloneDeploymentOwnerException exception) {
            System.out.println("FAILED");
            System.out.flush();
            System.exit(23);
        }
    }
}
