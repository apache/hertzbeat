package org.apache.hertzbeat.common.util;

import java.util.regex.Pattern;
import lombok.Data;
import org.apache.commons.lang3.StringUtils;

/**
 * the common function for jexl str equals, match, contains, etc.
 * sys:now() 
 */
@Data
public class JexlCommonFunction {

    /**
     * Get the current time in milliseconds
     * @return current time
     */
    public long now() {
        return System.currentTimeMillis();
    }


    /**
     * Define a custom string equality function
     * @param left left
     * @param right right
     * @return true if equals
     */
    public boolean equals(String left, String right) {
        if (left == null && right == null) {
            return true;
        }
        if (left == null || right == null) {
            return false;
        }
        return left.equals(right);
    }

    /**
     * Custom determines whether string 1 contains string 2 (case-insensitive)
     * @param left left
     * @param right right
     * @return true if contains
     */
    public boolean contains(String left, String right) {
        if (left == null || right == null) {
            return false;
        }
        return StringUtils.containsIgnoreCase(left, right);
    }


    /**
     * Custom determines if a value exists for this object in the environment
     * @param arg arg
     * @return true if exists
     */
    public boolean exists(Object arg) {
        if (arg == null) {
            return false;
        }
        return StringUtils.isNotEmpty(String.valueOf(arg));
    }

    /**
     * Custom determines if a string matches a regex
     * - regex You need to add "" or ''
     * @param str str
     * @param regex regex
     * @return true if matches
     */
    public boolean matches(String str, String regex) {
        if (str == null || regex == null) {
            return false;
        }
        return Pattern.compile(regex).matcher(str).matches();
    }
    
}
