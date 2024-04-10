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

package org.apache.hertzbeat.common.util;

import java.time.Duration;
import java.time.Period;
import java.time.temporal.TemporalAmount;

/**
 * time util
 */
public class TimePeriodUtil {

    /**
     * parse tokenTime to TemporalAmount
     * @param tokenTime eg: "1m", "5M", "3D", "30m", "2h", "1Y", "3W"
     * @return TemporalAmount
     */
    public static TemporalAmount parseTokenTime(String tokenTime) {
        if (Character.isUpperCase(tokenTime.charAt(tokenTime.length() - 1))) {
            return Period.parse("P" + tokenTime);
        } else {
            return Duration.parse("PT" + tokenTime);
        }
    }
}
