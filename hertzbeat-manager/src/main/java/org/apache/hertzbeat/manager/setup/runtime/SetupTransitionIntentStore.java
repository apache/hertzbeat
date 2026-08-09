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

package org.apache.hertzbeat.manager.setup.runtime;

import java.io.IOException;
import java.util.Optional;

/** Durable, secret-free intent that bridges a committed setup mutation and its runtime transition. */
public interface SetupTransitionIntentStore {

    Optional<Intent> load() throws IOException;

    void save(Intent intent) throws IOException;

    void clear(Intent completed) throws IOException;

    /** Completion subsumes the earlier configuration transition and must never be downgraded. */
    enum Intent {
        CONFIGURATION_APPLIED,
        INSTALLATION_COMPLETED;

        boolean supersedes(Intent current) {
            return this == INSTALLATION_COMPLETED && current == CONFIGURATION_APPLIED;
        }
    }
}
