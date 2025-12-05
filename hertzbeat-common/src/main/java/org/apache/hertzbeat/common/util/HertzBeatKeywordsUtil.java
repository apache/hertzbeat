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

import org.apache.hertzbeat.common.constants.HertzBeatKeywordsEnum;

import java.util.Arrays;

/**
 * Validate JEXL rules
 */
public class HertzBeatKeywordsUtil {


    /**
     * Verify if the field matches any reserved keywords
     *
     * @param field Field name to verify
     */
    public static void verifyKeywords(String field) {
        HertzBeatKeywordsEnum keyword = Arrays.stream(HertzBeatKeywordsEnum.values())
                .filter(t -> t.getKeyword().equals(field)).findFirst().orElse(null);
        if (null == keyword) {
            return;
        }
        throw new IllegalArgumentException(
                String.format("Field matches keyword `%s`, please set alias `%s`.",
                        keyword.getKeyword(), keyword.getAlias()));
    }
}