package org.dromara.hertzbeat.alert.util;

import lombok.extern.slf4j.Slf4j;

import java.text.ParseException;
import java.text.SimpleDateFormat;

/**
 * date time common util
 */
@Slf4j
public class DateUtil {

    private static final String[] DATE_FORMATS = {
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd HH:mm:ss"};

    /**
     * convert date to timestamp
     * @param date date
     */
    public static Long getTimeStampFromSomeFormats(String date) {
        SimpleDateFormat sdf;
        for (String dateFormat : DATE_FORMATS) {
            try {
                sdf = new SimpleDateFormat(dateFormat);
                return sdf.parse(date).getTime();
            } catch (ParseException e) {
                log.error(e.getMessage());
            }
        }
        return null;
    }

    /**
     * convert format data to timestamp
     */
    public static Long getTimeStampFromFormat(String date, String format) {
        SimpleDateFormat sdf = new SimpleDateFormat(format);
        try {
            return sdf.parse(date).getTime();
        } catch (Exception e) {
            log.error(e.getMessage());
        }
        return null;
    }

}
