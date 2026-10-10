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

package org.apache.hertzbeat.common.observability.dto.log;

/** Standard OpenTelemetry severity ranges, independent of the source severity text. */
public enum LogSeverityCategory {
    TRACE(1), DEBUG(5), INFO(9), WARN(13), ERROR(17), FATAL(21);

    private final int minimum;

    LogSeverityCategory(int minimum) {
        this.minimum = minimum;
    }

    public int minimum() {
        return minimum;
    }

    public int maximum() {
        return minimum + 3;
    }

    public boolean matches(Integer number) {
        return number != null && number >= minimum() && number <= maximum();
    }

    public static LogSeverityCategory parse(String value) {
        return value == null ? null : valueOf(value);
    }
}
