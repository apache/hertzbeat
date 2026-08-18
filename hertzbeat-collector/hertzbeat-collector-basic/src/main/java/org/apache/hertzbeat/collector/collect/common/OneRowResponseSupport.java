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

import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.springframework.util.StringUtils;

/**
 * Shared one-row response handling for command-based collectors.
 */
public final class OneRowResponseSupport {

    /**
     * Parse type where each output line maps to one alias field of a single result row.
     */
    public static final String PARSE_TYPE_ONE_ROW = "oneRow";

    private OneRowResponseSupport() {
    }

    /**
     * Treat blank stdout without an error signal (no stderr, exit status present and &lt;= 1,
     * grep-style no match) as valid empty one-row data: append a row of null placeholders so the
     * metric stays visible and alertable.
     *
     * @return true if handled as empty success, false if the caller should report a failure
     */
    public static boolean tryAppendEmptyOneRow(String parseType, String stdErr, Integer exitStatus,
                                               List<String> aliasFields, CollectRep.MetricsData.Builder builder,
                                               Long responseTime) {
        if (PARSE_TYPE_ONE_ROW.equals(parseType)
                && !StringUtils.hasText(stdErr)
                && exitStatus != null && exitStatus <= 1) {
            appendEmptyValues(aliasFields, builder, responseTime);
            return true;
        }
        return false;
    }

    /**
     * Build the failure message for a command that produced no usable stdout: prefer the captured
     * stderr, then a non-trivial exit status, otherwise the generic null-data message.
     */
    public static String buildBlankFailureMessage(String stdErr, Integer exitStatus,
                                                  String exitCodePrefix, String nullMessage) {
        if (StringUtils.hasText(stdErr)) {
            return stdErr.trim();
        }
        if (exitStatus != null && exitStatus > 1) {
            return exitCodePrefix + exitStatus;
        }
        return nullMessage;
    }

    /**
     * Map each output line to one alias field of a single row; missing trailing lines become
     * NULL_VALUE columns so a partial result keeps its values and the gap stays alertable.
     */
    public static void appendResponseValues(String result, List<String> aliasFields,
                                            CollectRep.MetricsData.Builder builder, Long responseTime) {
        List<String> safeAliasFields = aliasFields == null ? Collections.emptyList() : aliasFields;
        String[] lines = result.split("\n");
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        int aliasIndex = 0;
        int lineIndex = 0;
        while (aliasIndex < safeAliasFields.size()) {
            if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(safeAliasFields.get(aliasIndex))) {
                valueRowBuilder.addColumn(responseTime.toString());
            } else {
                if (lineIndex < lines.length) {
                    valueRowBuilder.addColumn(lines[lineIndex].trim());
                } else {
                    valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
                }
                lineIndex++;
            }
            aliasIndex++;
        }
        builder.addValueRow(valueRowBuilder.build());
    }

    public static void appendEmptyValues(List<String> aliasFields, CollectRep.MetricsData.Builder builder, Long responseTime) {
        List<String> safeAliasFields = aliasFields == null ? Collections.emptyList() : aliasFields;
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (String aliasField : safeAliasFields) {
            if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(aliasField)) {
                valueRowBuilder.addColumn(responseTime.toString());
            } else {
                valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
            }
        }
        builder.addValueRow(valueRowBuilder.build());
    }
}
