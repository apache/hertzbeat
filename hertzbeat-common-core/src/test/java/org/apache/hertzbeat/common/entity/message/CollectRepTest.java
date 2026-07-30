/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.entity.message;

import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test case for {@link CollectRep}
 */
public class CollectRepTest {

    @ParameterizedTest
    @CsvSource(value = {
            "name, name, true",
            "name1, name3, false",
    })
    void testFieldEquals(String name1, String name2, boolean result) {
        CollectRep.Field field1 = new CollectRep.Field();
        field1.setName(name1);
        CollectRep.Field field2 = new CollectRep.Field();
        field2.setName(name2);
       
        assertEquals(field1.equals(field2), result);
    }

    @Test
    void boundsArrowStringValueSize() {
        String oversizedValue = "a".repeat(100_000);
        CollectRep.Field field = CollectRep.Field.newBuilder()
                .setName("payload")
                .setType(1)
                .build();
        CollectRep.ValueRow row = new CollectRep.ValueRow(List.of(oversizedValue));

        try (CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .addField(field)
                .addValueRow(row)
                .build()) {
            String storedValue = metricsData.getValues().getFirst().getColumns(0);
            assertTrue(storedValue.getBytes(StandardCharsets.UTF_8).length <= 32_700);
        }
    }

}
