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
