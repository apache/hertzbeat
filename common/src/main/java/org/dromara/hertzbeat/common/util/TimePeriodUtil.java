package org.dromara.hertzbeat.common.util;

import java.time.Duration;
import java.time.Period;
import java.time.temporal.TemporalAmount;

/**
 * time util
 * @author tom
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
