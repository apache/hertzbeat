package org.apache.hertzbeat.common.util;


import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * String processing tools
 */
public class StrUtil {

    /**
     * Handle Comma Separated Data
     * @param arg
     * @return Data List
     */
    public static List<String> analysisArgToList(String arg) {
        if (Objects.isNull(arg)) {
            return Collections.emptyList();
        }
        return Arrays.asList(arg.split("\\s*,\\s*"));
    }

}
