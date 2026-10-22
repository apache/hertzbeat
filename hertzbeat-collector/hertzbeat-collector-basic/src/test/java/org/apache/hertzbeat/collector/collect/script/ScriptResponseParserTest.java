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

package org.apache.hertzbeat.collector.collect.script;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link ScriptResponseParser}
 */
public class ScriptResponseParserTest {

    private CollectRep.MetricsData.Builder builder;

    @BeforeEach
    void setUp() {
        builder = CollectRep.MetricsData.newBuilder();
    }

    @Test
    void keepsValuesThatContainEqualsSigns() {
        // https://github.com/apache/hertzbeat/issues/4456
        // a key-value line must split at the first '=', so values like a
        // base64 token or a URL with query parameters are kept intact
        String response = "control=ok\ntoken=abc==\nendpoint=http://localhost/path?mode=read\n";
        ScriptResponseParser.parseResponseDataByNetcat(
                response, List.of("control", "token", "endpoint"), builder, 100L);
        CollectRep.ValueRow row = builder.getValues(0);
        assertEquals("ok", row.getColumns(0));
        assertEquals("abc==", row.getColumns(1));
        assertEquals("http://localhost/path?mode=read", row.getColumns(2));
    }

    @Test
    void keepsTabSeparatedParsingUnchanged() {
        String response = "control\tok\ntoken\tabc";
        ScriptResponseParser.parseResponseDataByNetcat(
                response, List.of("control", "token"), builder, 100L);
        CollectRep.ValueRow row = builder.getValues(0);
        assertEquals("ok", row.getColumns(0));
        assertEquals("abc", row.getColumns(1));
    }

    @Test
    void keepsExplicitlyEmptyValuesAsEmptyStrings() {
        // split("=", 2) keeps the trailing empty string, so a line like "key="
        // is a field the device explicitly reported with an empty value
        String response = "control=ok\nempty=\n";
        ScriptResponseParser.parseResponseDataByNetcat(
                response, List.of("control", "empty", "missing"), builder, 100L);
        CollectRep.ValueRow row = builder.getValues(0);
        assertEquals("ok", row.getColumns(0));
        assertEquals("", row.getColumns(1));
        // a field the device never reported still renders as no-data
        assertEquals(CommonConstants.NULL_VALUE, row.getColumns(2));
    }

    @Test
    void missingFieldsStillReportNullValue() {
        String response = "control=ok\n";
        ScriptResponseParser.parseResponseDataByNetcat(
                response, List.of("control", "token"), builder, 100L);
        CollectRep.ValueRow row = builder.getValues(0);
        assertEquals("ok", row.getColumns(0));
        assertEquals(CommonConstants.NULL_VALUE, row.getColumns(1));
    }
}
