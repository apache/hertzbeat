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

/**
 * Optional util
 */
public class OptionalUtil {

    /**
     * return obj if not null, else return defaultValue
     *
     * @param obj          object to check
     * @param defaultValue default value
     * @param <T>          type
     * @return obj or defaultValue
     */
    public static <T> T ofNullable(T obj, T defaultValue) {
        return obj == null ? defaultValue : obj;
    }


    /**
     * return obj if not null, else throw IllegalArgumentException
     *
     * @param obj object to check
     * @param <T> type
     * @return obj
     * @throws IllegalArgumentException if obj is null
     */
    public static <T> T of(T obj) throws IllegalArgumentException {
        if (obj == null) {
            throw new IllegalArgumentException("Invalid exponential backoff params");
        }
        return obj;
    }

}