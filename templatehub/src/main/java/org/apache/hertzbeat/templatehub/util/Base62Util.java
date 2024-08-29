package org.apache.hertzbeat.templatehub.util;

public final class Base62Util {
    private static final String BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    private Base62Util() {
    }

    /**
     * Long to short
     */
    public static String idToShortKey(long id) {
        StringBuilder stringBuilder = new StringBuilder();
        while (id > 0) {
            stringBuilder.append(BASE62.charAt((int) (id % 62)));
            id = id / 62;
        }

//        while (stringBuilder.length() < 6) {
//            stringBuilder.append(0);
//        }

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

