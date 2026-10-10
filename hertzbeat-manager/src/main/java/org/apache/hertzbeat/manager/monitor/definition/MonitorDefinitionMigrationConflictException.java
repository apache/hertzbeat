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

package org.apache.hertzbeat.manager.monitor.definition;

import java.util.List;

/** Signals that a target contains same-name definitions with different content. */
public class MonitorDefinitionMigrationConflictException extends IllegalStateException {

    public static final String ERROR_CODE = "object_store_migration_conflict";

    private final List<String> apps;

    public MonitorDefinitionMigrationConflictException(List<String> apps) {
        super("monitor definition migration conflict");
        this.apps = List.copyOf(apps);
    }

    public List<String> apps() {
        return apps;
    }
}
