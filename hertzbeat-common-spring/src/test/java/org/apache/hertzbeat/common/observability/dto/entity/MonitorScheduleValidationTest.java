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

package org.apache.hertzbeat.common.observability.dto.entity;

import static org.junit.jupiter.api.Assertions.assertTrue;
import jakarta.validation.Validation;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.junit.jupiter.api.Test;

class MonitorScheduleValidationTest {

    @Test
    void intervalMinimumIsOwnedByTheServiceContract() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            MonitorInfo info = new MonitorInfo();
            info.setIntervals(1);
            Monitor monitor = Monitor.builder().intervals(1).build();

            assertTrue(validator.validate(info).isEmpty());
            assertTrue(validator.validate(monitor).isEmpty());
        }
    }
}
