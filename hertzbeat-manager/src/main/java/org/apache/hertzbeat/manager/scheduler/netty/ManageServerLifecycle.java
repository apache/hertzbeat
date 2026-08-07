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

package org.apache.hertzbeat.manager.scheduler.netty;

import org.apache.hertzbeat.common.runtime.ConditionalOnNormalBusinessRuntime;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Owns the Collector command server socket and health-check executors only in normal runtime. */
@Component
@Order(value = Ordered.LOWEST_PRECEDENCE)
@ConditionalOnNormalBusinessRuntime
@ConditionalOnProperty(prefix = "scheduler.server", name = "enabled", havingValue = "true")
public final class ManageServerLifecycle implements CommandLineRunner, DisposableBean {

    private final ManageServer manageServer;

    public ManageServerLifecycle(ManageServer manageServer) {
        this.manageServer = manageServer;
    }

    @Override
    public void run(String... args) {
        manageServer.start();
    }

    @Override
    public void destroy() {
        manageServer.shutdown();
    }
}
