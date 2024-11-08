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

package org.apache.hertzbeat.templatehub.controller;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * token storage
 * you can use redis instead of it
 * @author tomsun28
 * @date 2020-12-03 23:01
 */
public class TokenStorage {

    private static final String TOKEN_SPLIT = "--";
    private static final int TOKEN_SPLIT_SIZE = 4;
    private static final int START_TIME_INDEX = 1;
    private static final int PERIOD_TIME_INDEX = 2;

    private static final Map<String, String> TOKEN_MAP = new ConcurrentHashMap<>();

    /**
     * match token
     * @param key key
     * @param currentToken tokenValue is : admin--issueTime--refreshPeriodTime--uuid
     * @return false when token not exist, not equals or Expired, else true
     */
    public static boolean matchToken(String key, String currentToken) {
        if (key == null || currentToken == null || "".equals(key) || "".equals(currentToken)
                || currentToken.split(TOKEN_SPLIT).length != TOKEN_SPLIT_SIZE) {
            return false;
        }
        String originToken  = TOKEN_MAP.get(key);
        if (originToken == null || !originToken.equals(currentToken)) {
            removeToken(key);
            return false;
        }
        String[] tokenArr = currentToken.split(TOKEN_SPLIT);
        if (Long.parseLong(tokenArr[START_TIME_INDEX]) + Long.parseLong(tokenArr[PERIOD_TIME_INDEX])
                <= System.currentTimeMillis()) {
            // token expired, remove it
            removeToken(key);
            return false;
        }
        return true;
    }

    public static void removeToken(String key) {
        if (key == null || "".equals(key)) {
            return;
        }
        TOKEN_MAP.remove(key);
    }

    public static void addToken(String key, String token) {
        if (key == null || token == null || "".equals(key) || "".equals(token)
                || token.split(TOKEN_SPLIT).length != TOKEN_SPLIT_SIZE) {
            return;
        }
        TOKEN_MAP.put(key, token);
    }
}
