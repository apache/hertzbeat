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

package org.apache.hertzbeat.collector.collect.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;

class OneRowResponseSupportTest {

    @Test
    void appendResponseValuesShouldMapColumnsInOrder() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();

        OneRowResponseSupport.appendResponseValues(
                "pod-a\n5\n", List.of("pod", "restart", CollectorConstants.RESPONSE_TIME), builder, 18L);

        assertEquals(1, builder.getValuesCount());
        assertEquals("pod-a", builder.getValues(0).getColumns(0));
        assertEquals("5", builder.getValues(0).getColumns(1));
        assertEquals("18", builder.getValues(0).getColumns(2));
    }

    @Test
    void appendResponseValuesShouldPadMissingTrailingLines() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();

        OneRowResponseSupport.appendResponseValues(
                "52\n35.8033\n5%",
                List.of("cpu", "memory", "disk", "nfs_mount", CollectorConstants.RESPONSE_TIME), builder, 18L);

        assertEquals(1, builder.getValuesCount());
        assertEquals("52", builder.getValues(0).getColumns(0));
        assertEquals("35.8033", builder.getValues(0).getColumns(1));
        assertEquals("5%", builder.getValues(0).getColumns(2));
        assertEquals(CommonConstants.NULL_VALUE, builder.getValues(0).getColumns(3));
        assertEquals("18", builder.getValues(0).getColumns(4));
    }

    @Test
    void appendEmptyValuesShouldFillNullPlaceholders() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();

        OneRowResponseSupport.appendEmptyValues(
                List.of("nfs_mount", CollectorConstants.RESPONSE_TIME), builder, 12L);

        assertEquals(1, builder.getValuesCount());
        assertEquals(CommonConstants.NULL_VALUE, builder.getValues(0).getColumns(0));
        assertEquals("12", builder.getValues(0).getColumns(1));
    }

    @Test
    void tryAppendEmptyOneRowShouldAcceptGrepNoMatchExitOne() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();

        // grep with no match exits 1 and writes nothing: treat as valid empty data, not a failure
        boolean handled = OneRowResponseSupport.tryAppendEmptyOneRow(
                OneRowResponseSupport.PARSE_TYPE_ONE_ROW, "", 1,
                List.of("nfs_mount", CollectorConstants.RESPONSE_TIME), builder, 9L);

        assertTrue(handled);
        assertEquals(1, builder.getValuesCount());
        assertEquals(CommonConstants.NULL_VALUE, builder.getValues(0).getColumns(0));
    }

    @Test
    void tryAppendEmptyOneRowShouldRejectNullExitStatus() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();

        // an absent exit status (e.g. dropped ssh channel) must be treated as a failure
        boolean handled = OneRowResponseSupport.tryAppendEmptyOneRow(
                OneRowResponseSupport.PARSE_TYPE_ONE_ROW, "", null,
                List.of("nfs_mount"), builder, 9L);

        assertFalse(handled);
        assertEquals(0, builder.getValuesCount());
    }

    @Test
    void tryAppendEmptyOneRowShouldRejectNonEmptyStderr() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();

        boolean handled = OneRowResponseSupport.tryAppendEmptyOneRow(
                OneRowResponseSupport.PARSE_TYPE_ONE_ROW, "permission denied", 1,
                List.of("nfs_mount"), builder, 9L);

        assertFalse(handled);
        assertEquals(0, builder.getValuesCount());
    }

    @Test
    void buildBlankFailureMessageShouldPreferStderrThenExitCode() {
        assertEquals("permission denied", OneRowResponseSupport.buildBlankFailureMessage(
                "permission denied\n", 2, "cmd exited with code: ", "null data"));
        assertEquals("cmd exited with code: 2", OneRowResponseSupport.buildBlankFailureMessage(
                "", 2, "cmd exited with code: ", "null data"));
        assertEquals("null data", OneRowResponseSupport.buildBlankFailureMessage(
                "", 1, "cmd exited with code: ", "null data"));
        assertEquals("null data", OneRowResponseSupport.buildBlankFailureMessage(
                "", null, "cmd exited with code: ", "null data"));
    }
}
