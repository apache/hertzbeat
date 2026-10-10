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

package org.apache.hertzbeat.alert.util;

/**
 * Recognizes transport and payload label aliases reserved for workspace authority.
 */
public final class AlertWorkspaceLabelKeys {

    private AlertWorkspaceLabelKeys() {
    }

    public static boolean isReserved(String key) {
        if (key == null) {
            return false;
        }
        String normalized = key.replace("-", "")
                .replace("_", "")
                .replace(".", "");
        return "workspace".equalsIgnoreCase(normalized)
                || "workspaceid".equalsIgnoreCase(normalized)
                || "hertzbeatworkspaceid".equalsIgnoreCase(normalized)
                || "xhertzbeatworkspaceid".equalsIgnoreCase(normalized);
    }

    /**
     * Returns whether a label is reserved for source-backed HertzBeat resource authority.
     */
    public static boolean isInternalResourceAuthority(String key) {
        if (key == null) {
            return false;
        }
        String normalized = key.replace("-", "")
                .replace("_", "")
                .replace(".", "");
        return "hertzbeatmonitorid".equalsIgnoreCase(normalized)
                || "hertzbeatentityid".equalsIgnoreCase(normalized);
    }
}
