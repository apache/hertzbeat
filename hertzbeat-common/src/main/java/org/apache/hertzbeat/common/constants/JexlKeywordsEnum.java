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

package org.apache.hertzbeat.common.constants;

import java.util.Arrays;

/**
 * Jexl keywords enum
 */
public enum JexlKeywordsEnum {

    SIZE("size"),
    EMPTY("empty"),
    NEW("new"),
    VAR("var"),
    RETURN("return"),
    IF("if"),
    ELSE("else"),
    ELSEIF("elseif"),
    WHILE("while"),
    DO("do"),
    FOR("for"),
    CONTINUE("continue"),
    BREAK("break"),
    TRUE("true"),
    FALSE("false"),
    NULL("null"),
    UNDEFINED("undefined");

    private final String keyword;

    JexlKeywordsEnum(String keyword) {
        this.keyword = keyword;
    }

    public String getKeyword() {
        return keyword;
    }

    public static boolean match(String word) {
        if (word == null || word.trim().isEmpty()) {
            return false;
        }
        return Arrays.stream(values()).anyMatch(t -> t.keyword.equals(word));
    }

}