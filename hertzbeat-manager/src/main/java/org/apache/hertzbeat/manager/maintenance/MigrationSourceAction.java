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

package org.apache.hertzbeat.manager.maintenance;

import java.sql.Connection;

/** Synchronous work scoped to the exact metadata source held by a maintenance lease. */
@FunctionalInterface
public interface MigrationSourceAction {

    /**
     * Uses the guarded source only for this callback. The action must not retain, replace, or
     * independently close the connection. Only the bounded JDBC migration executor may invalidate
     * it on a fail-closed timeout or unknown-outcome path; final ownership remains with the lease.
     */
    void execute(Connection source);
}
