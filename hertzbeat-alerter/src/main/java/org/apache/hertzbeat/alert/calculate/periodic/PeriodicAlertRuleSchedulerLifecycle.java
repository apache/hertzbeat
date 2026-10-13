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

package org.apache.hertzbeat.alert.calculate.periodic;

import org.apache.hertzbeat.common.runtime.ConditionalOnNormalBusinessRuntime;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Owns scheduler threads and database startup reads only in normal business runtime. */
@Component
@ConditionalOnNormalBusinessRuntime
public final class PeriodicAlertRuleSchedulerLifecycle implements CommandLineRunner, DisposableBean {

    private final PeriodicAlertRuleScheduler scheduler;

    public PeriodicAlertRuleSchedulerLifecycle(PeriodicAlertRuleScheduler scheduler) {
        this.scheduler = scheduler;
    }

    @Override
    public void run(String... args) {
        scheduler.start();
    }

    @Override
    public void destroy() {
        scheduler.stop();
    }
}
