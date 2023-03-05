package com.usthe.common.util;

import java.time.Duration;
import java.time.Period;
import java.time.temporal.TemporalAmount;

/**
 * time util
 *
 * @author tom
 * @date 2023/3/5 16:45
 */
public class TimePeriodUtil {

    /**
     * parse tokenTime to TemporalAmount
     * @param tokenTime eg: "1m", "5M", "3D", "30m", "2h", "1Y", "3W"
     * @return TemporalAmount
     */
    public static TemporalAmount parseTokenTime(String tokenTime) {
        if (Character.isUpperCase(tokenTime.charAt(tokenTime.length() - 1))) {
            return Period.parse("P" + tokenTime);
        } else {
            return Duration.parse("PT" + tokenTime);
        }
    }
}
