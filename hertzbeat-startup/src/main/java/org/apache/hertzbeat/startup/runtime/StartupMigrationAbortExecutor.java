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

import java.util.concurrent.Executor;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/** Process-lifetime bounded daemon lanes for JDBC abort callbacks retained beyond session close. */
final class StartupMigrationAbortExecutor {

    private static final Executor PROCESS_LIFETIME = new ThreadPoolExecutor(
            2, 2, 0L, TimeUnit.MILLISECONDS, new SynchronousQueue<>(),
            Thread.ofPlatform().daemon().name("hertzbeat-migration-abort-", 0).factory(),
            new ThreadPoolExecutor.AbortPolicy());

    private StartupMigrationAbortExecutor() {
    }

    static Executor processLifetime() {
        return PROCESS_LIFETIME;
    }
}
