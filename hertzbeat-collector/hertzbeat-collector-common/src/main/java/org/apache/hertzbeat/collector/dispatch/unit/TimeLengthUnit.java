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

package org.apache.hertzbeat.collector.dispatch.unit;

/**
 * the enum of time length
 */
public enum TimeLengthUnit {
    /**
     * NANOSECONDS
     */
    NS("NS", 1),
    /**
     * MICROSECONDS
     */
    US("US", 1000),
    /**
     * MILLISECONDS
     */
    MS("MS", 1000_000),
    /**
     * SECONDS
     */
    S("S", 1000_000_000),
    /**
     * MINUTES
     */
    MIN("MIN", 60_000_000_000L),
    /**
     * HOURS
     */
    H("H", 3600_000_000_000L),
    /**
     * DAYS
     */
    D("D", 86_400_000_000_000L);

    private final String unit;
    private final long scale;

    TimeLengthUnit(String unit, long scale) {
        this.unit = unit;
        this.scale = scale;
    }

    public String getUnit() {
        return unit;
    }

    public long getScale() {
        return scale;
    }
}
