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

package org.apache.hertzbeat.common.util;

import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import org.slf4j.Logger;

import java.text.MessageFormat;

/**
 * Log utility class that provides formatted logging methods with location information.
 * This class enhances standard SLF4J logging by automatically adding caller location details.
 */
public class LogUtil {

    private static final String TEMPLATE_REGEX = "\\{\\d}";

    /**
     * Print debug level formatted log
     * Example: LogUtil.debug(logger, "hello,{0},here has a {1} exception", "other information");
     */
    @SuppressWarnings("unused")
    public static void debug(Logger logger, String msg, Object... params) {
        if (logger.isDebugEnabled()) {

            if (ArrayUtils.isEmpty(params)) {
                logger.debug(LogUtil.buildLocationInfo() + msg);
            } else {
                logger.debug(LogUtil.buildLocationInfo() + format(msg, params));
            }
        }
    }


    /**
     * Print info level formatted log
     * Example: LogUtil.info(logger, "hello,{0},{1} exception", "dear", "database operation");
     */
    public static void info(Logger logger, String msg, Object... params) {
        if (logger.isInfoEnabled()) {
            if (ArrayUtils.isEmpty(params)) {
                logger.info(LogUtil.buildLocationInfo() + msg);
            } else {
                logger.info(LogUtil.buildLocationInfo() + format(msg, params));
            }
        }
    }

    /**
     * Print warn level formatted log
     */
    public static void warn(Logger logger, String msg, Object... params) {
        if (logger.isWarnEnabled()) {
            if (ArrayUtils.isEmpty(params)) {
                logger.warn(LogUtil.buildLocationInfo() + msg);
            } else {
                logger.warn(LogUtil.buildLocationInfo() + format(msg, params));
            }
        }
    }

    /**
     * Print error level formatted log, use {0},{1},.. for parameter replacement
     * Example: LogUtil.error(logger, "hello,{0}, a {1} exception occurred here", "dear", "database operation");
     */
    public static void error(Logger logger, String msg, Object... params) {
        if (logger.isErrorEnabled()) {
            if (ArrayUtils.isEmpty(params)) {
                logger.error(LogUtil.buildLocationInfo() + msg);
            } else {
                logger.error(LogUtil.buildLocationInfo() + format(msg, params));
            }
        }

    }


    /**
     * Print warn level formatted log with exception, use {0},{1},.. for parameter replacement
     * Example: LogUtil.warn(logger, e, "hello,{0}, a {1} exception occurred here", "dear", "database operation");
     */
    public static void warn(Logger logger, Throwable e, String msg, Object... params) {
        if (logger.isWarnEnabled()) {
            if (ArrayUtils.isEmpty(params)) {
                logger.warn(LogUtil.buildLocationInfo() + msg, e);
            } else {
                logger.warn(LogUtil.buildLocationInfo() + format(msg, params), e);
            }
        }
    }


    /**
     * Print error level formatted log with exception, use {0},{1},.. for parameter replacement
     * Example: LogUtil.error(logger, e, "hello,{0}, a {1} exception occurred here", "dear", "database operation");
     */
    public static void error(Logger logger, Throwable e, String msg, Object... params) {
        if (logger.isErrorEnabled()) {
            if (ArrayUtils.isEmpty(params)) {
                logger.error(LogUtil.buildLocationInfo() + msg, e);
            } else {
                logger.error(LogUtil.buildLocationInfo() + format(msg, params), e);
            }
        }

    }


    /**
     * Get the class name, method and line number that calls LogUtil
     *
     * @return location information string
     */
    private static String buildLocationInfo() {
        StringBuilder header = new StringBuilder();
        // LOG4J2-1029 new Throwable().getStackTrace is faster than Thread.currentThread().getStackTrace().
        final StackTraceElement[] stackTraceElements = new Throwable().getStackTrace();

        for (int i = 0; i < stackTraceElements.length - 1; i++) {
            StackTraceElement currentStackTrace = stackTraceElements[i];
            StackTraceElement nextStackTrace = stackTraceElements[i + 1];

            // If current stack trace is in LogUtil
            // and next stack trace is not in LogUtil
            // then the next node is the caller of LogUtil
            if (LogUtil.class.getName().equals(currentStackTrace.getClassName())
                    && !LogUtil.class.getName().equals(nextStackTrace.getClassName())) {
                String stackTrace = nextStackTrace.toString();
                header.append(" ").append(StringUtils.removeStart(stackTrace, nextStackTrace.getClassName() + "."));
                break;
            }
        }
        return header.append(":").toString();
    }

    private static String format(String msg, Object... params) {
        if (StringUtils.isEmpty(msg)) {
            return StringUtils.EMPTY;
        }
        if (params != null && params.length > 0) {
            msg = MessageFormat.format(msg, params);
        }
        return msg.replaceAll(TEMPLATE_REGEX, StringUtils.EMPTY);
    }

    private static String toString(Object object) {
        return ToStringBuilder.reflectionToString(object, ToStringStyle.SHORT_PREFIX_STYLE);
    }
}