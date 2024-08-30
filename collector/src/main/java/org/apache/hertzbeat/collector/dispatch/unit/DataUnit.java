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
 * the enum of data size
 */
public enum DataUnit {
    /**
     * byte
     */
    B("B", 1),
    /**
     * kilobyte
     */
    KB("KB", 1024),
    /**
     * kilobyte
     */
    K("K", 1024),
    /**
     * kilobyte
     */
    KI("KI", 1024),
    /**
     * megabyte
     * 1024 * 1024
     */
    MB("MB", 1_048_576),
    /**
     * megabyte
     * 1024 * 1024
     */
    MI("MI", 1_048_576),
    /**
     * megabyte
     * 1024 * 1024
     */
    M("M", 1_048_576),
    /**
     * gigabyte
     * 1024 * 1024 * 1024
     */
    GB("GB", 1_073_741_824),
    /**
     * gigabyte
     * 1024 * 1024 * 1024
     */
    GI("GI", 1_073_741_824),
    /**
     * gigabyte
     * 1024 * 1024 * 1024
     */
    G("G", 1_073_741_824);

    private final String unit;
    private final long scale;

    DataUnit(String unit, long scale) {
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
