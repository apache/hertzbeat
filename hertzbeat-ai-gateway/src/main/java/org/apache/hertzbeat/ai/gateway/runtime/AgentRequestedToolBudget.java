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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.util.Locale;
import java.util.ResourceBundle;
import java.util.regex.Pattern;

/** Extracts explicit numeric tool limits only from the original user request. */
final class AgentRequestedToolBudget {
    private static final Pattern REQUEST_LIMIT = Pattern.compile(ResourceBundle.getBundle("agent_evidence", Locale.ROOT)
            .getString("request.toolBudget"), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    private AgentRequestedToolBudget() {
    }

    static int maximum(String message, int configured) {
        int maximum = configured;
        if (message == null) {
            return maximum;
        }
        var matcher = REQUEST_LIMIT.matcher(message);
        while (matcher.find()) {
            String digits = matcher.group(1) == null ? matcher.group(2) : matcher.group(1);
            try {
                maximum = Math.min(maximum, Integer.parseInt(digits));
            } catch (NumberFormatException ignored) {
                // An out-of-range integer cannot lower the configured limit.
            }
        }
        return maximum;
    }
}
