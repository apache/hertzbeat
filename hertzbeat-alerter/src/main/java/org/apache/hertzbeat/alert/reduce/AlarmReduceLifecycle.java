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

package org.apache.hertzbeat.alert.reduce;

import org.apache.hertzbeat.common.runtime.ConditionalOnNormalBusinessRuntime;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Loads reducer rules and starts cleanup/grouping workers only in normal runtime. */
@Component
@ConditionalOnNormalBusinessRuntime
public final class AlarmReduceLifecycle implements CommandLineRunner {

    private final AlarmInhibitReduce inhibitReduce;
    private final AlarmGroupReduce groupReduce;

    public AlarmReduceLifecycle(AlarmInhibitReduce inhibitReduce, AlarmGroupReduce groupReduce) {
        this.inhibitReduce = inhibitReduce;
        this.groupReduce = groupReduce;
    }

    @Override
    public void run(String... args) {
        inhibitReduce.start();
        groupReduce.start();
    }
}
