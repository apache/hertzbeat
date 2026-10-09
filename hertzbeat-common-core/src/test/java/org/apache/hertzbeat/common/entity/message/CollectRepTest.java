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
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.params.provider.Arguments.arguments;

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

    @ParameterizedTest(name = "{0}")
    @MethodSource("largeMetricValues")
    void preservesArrowStringValue(String description, String value) {
        CollectRep.Field field = CollectRep.Field.newBuilder()
                .setName("payload")
                .setType(1)
                .build();
        CollectRep.ValueRow row = new CollectRep.ValueRow(List.of(value));

        try (CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .addField(field)
                .addValueRow(row)
                .build()) {
            String storedValue = metricsData.getValues().getFirst().getColumns(0);
            assertEquals(
                    value.getBytes(StandardCharsets.UTF_8).length,
                    storedValue.getBytes(StandardCharsets.UTF_8).length);
            assertEquals(value, storedValue);
        }
    }

    private static Stream<Arguments> largeMetricValues() {
        String ideograph = "\u4e2d";
        String emoji = new String(Character.toChars(0x1F600));
        return Stream.of(
                arguments("ASCII before previous boundary", "a".repeat(32_699)),
                arguments("ASCII at previous boundary", "a".repeat(32_700)),
                arguments("ASCII after previous boundary", "a".repeat(32_701)),
                arguments("large ASCII value", "a".repeat(100_000)),
                arguments("multibyte before previous boundary", ideograph.repeat(10_899)),
                arguments("multibyte at previous boundary", ideograph.repeat(10_900)),
                arguments("multibyte after previous boundary", ideograph.repeat(10_901)),
                arguments("emoji before previous boundary", emoji.repeat(8_174)),
                arguments("emoji at previous boundary", emoji.repeat(8_175)),
                arguments("emoji after previous boundary", emoji.repeat(8_176)));
    }

}
