/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dto.AlertInhibitRequest;
import org.junit.jupiter.api.Test;

class AlertInhibitContractMapperTest {

    private final AlertInhibitContractMapper mapper = new AlertInhibitContractMapper();

    @Test
    void createRejectsIdentityAndRequiresOperationalMatchers() {
        AlertInhibitRequest request = request();
        request.setId(7L);
        assertThrows(IllegalArgumentException.class, () -> mapper.toNewEntity(request));

        request.setId(null);
        request.setSourceLabels(Map.of());
        assertThrows(IllegalArgumentException.class, () -> mapper.toNewEntity(request));
    }

    @Test
    void normalizesSafeExplicitRequest() {
        AlertInhibitRequest request = request();
        request.setName("  Host severity suppression  ");

        var entity = mapper.toNewEntity(request);

        assertEquals("Host severity suppression", entity.getName());
        assertEquals(Map.of("severity", "critical"), entity.getSourceLabels());
        assertEquals(Map.of("severity", "warning"), entity.getTargetLabels());
        assertEquals(List.of("instance"), entity.getEqualLabels());
    }

    private AlertInhibitRequest request() {
        AlertInhibitRequest request = new AlertInhibitRequest();
        request.setName("Host severity suppression");
        request.setEnable(true);
        request.setSourceLabels(Map.of("severity", "critical"));
        request.setTargetLabels(Map.of("severity", "warning"));
        request.setEqualLabels(List.of("instance"));
        return request;
    }
}
