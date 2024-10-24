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

package org.apache.hertzbeat.templatehub.util;

public final class Base62Util {
    private static final String BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    private Base62Util() {
    }

    public static boolean isBase62(String str) {
        if (str == null || str.isEmpty()) {
            return false;
        }

        for (char c : str.toCharArray()) {
            if (BASE62.indexOf(c) == -1) {
                return false;
            }
        }

        return true;
    }

    /**
     * Long to short
     */
    public static String idToShortKey(long id) {
        StringBuilder stringBuilder = new StringBuilder();
        if(id==0){
            stringBuilder.append("0");
            return stringBuilder.toString();
        }
        while (id > 0) {
            stringBuilder.append(BASE62.charAt((int) (id % 62)));
            id = id / 62;
        }

        return stringBuilder.reverse().toString();
    }

    public static long shortKeyToId(String shortKey) {
        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append(shortKey);
        while (stringBuilder.length() < 6) {
            stringBuilder.append(0);
        }
        long id = 0;
        for (int i = 0; i < shortKey.length(); i++) {
            id = id * 62 + BASE62.indexOf(shortKey.charAt(i));
        }

        return id;
    }
}

