package org.apache.hertzbeat.common.util;

import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;

import java.text.MessageFormat;

public class StringUtil extends StringUtils {
    /**
     * Regular expression for matching placeholders, such as {0}
     */
    private static final String TEMPLATE_REGEX = "\\{\\d}";

    public static String format(String msg, Object... params){
        if (StringUtils.isEmpty(msg)){
            return StringUtils.EMPTY;
        }
        if (params != null && params.length > 0){
            msg = MessageFormat.format(msg,params);
        }
        return msg.replaceAll(StringUtil.TEMPLATE_REGEX, StringUtils.EMPTY);
    }

    /**
     * Override toString method
     * @return string representation of the object
     */
    public static String toString(Object object){
        return ToStringBuilder.reflectionToString(object, ToStringStyle.SHORT_PREFIX_STYLE);
    }
}
