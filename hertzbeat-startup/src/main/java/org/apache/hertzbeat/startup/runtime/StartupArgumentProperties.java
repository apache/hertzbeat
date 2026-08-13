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

import org.springframework.core.env.SimpleCommandLinePropertySource;

/** Resolves explicitly allowed pre-Spring properties without exposing arbitrary application arguments. */
final class StartupArgumentProperties {

    private StartupArgumentProperties() {
    }

    static String resolve(String[] args, String propertyName, String systemValue, String environmentValue) {
        String commandLineValue = new SimpleCommandLinePropertySource(
                args == null ? new String[0] : args).getProperty(propertyName);
        if (commandLineValue != null) {
            return commandLineValue;
        }
        return systemValue == null ? environmentValue : systemValue;
    }
}
