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

import org.apache.hertzbeat.common.constants.JexlKeywordsEnum;

/**
 * Validate JEXL rules
 */
public class JexlCheckerUtil {

    public static final String SPACES_REGEX = "^\\S+(?:\\s+\\S+)+$";

    /**
     * Verify Keyword Information
     */
    public static boolean verifyKeywords(String str) {
        return JexlKeywordsEnum.match(str);
    }

    /**
     * Verify the starting character
     */
    public static boolean verifyStartCharacter(String str) {
        char c = str.charAt(0);
        return !((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == '_' || c == '$');
    }

    /**
     * Verify contains spaces
     */
    public static boolean verifySpaces(String str) {
        return str.trim().matches(SPACES_REGEX);
    }
}