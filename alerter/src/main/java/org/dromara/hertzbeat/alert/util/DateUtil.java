package org.dromara.hertzbeat.alert.util;

import java.text.ParseException;
import java.text.SimpleDateFormat;

/**
 * 记录一些常用的日期格式
 */
public class DateUtil {

    private static final String[] DATE_FORMATS = {
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd HH:mm:ss"};

    /**
     * 常用日期格式转时间戳
     */
    public static Long getTimeStampFromSomeFormats(String date) {
        SimpleDateFormat sdf;
        for (String dateFormat : DATE_FORMATS) {
            try {
                sdf = new SimpleDateFormat(dateFormat);
                return sdf.parse(date).getTime();
            } catch (ParseException e) {}
        }
        return null;
    }

    /**
     * 指定日期格式转换时间戳
     */
    public static Long getTimeStampFromFormat(String date, String format) {
        SimpleDateFormat sdf = new SimpleDateFormat(format);
        try {
            return sdf.parse(date).getTime();
        } catch (Exception e) {
            throw new RuntimeException("时间格式解析异常！");
        }
    }

}
