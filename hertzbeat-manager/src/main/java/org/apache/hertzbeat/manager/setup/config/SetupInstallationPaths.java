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
import org.springframework.core.env.Environment;

/** Shared installation-root names used by startup loading and setup writers. */
public final class SetupInstallationPaths {
    public static final String ROOT_PROPERTY = "hertzbeat.internal.installation-root";

    private SetupInstallationPaths() {
    }

    public static Path root(Environment environment) {
        return Path.of(environment.getProperty(ROOT_PROPERTY, ".")).toAbsolutePath().normalize();
    }
}
