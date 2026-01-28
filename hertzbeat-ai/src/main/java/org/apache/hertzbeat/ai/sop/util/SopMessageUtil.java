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

package org.apache.hertzbeat.ai.sop.util;

import java.util.Locale;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

/**
 * Utility class for SOP internationalization messages.
 * Provides static access to MessageSource for POJOs like SopResult.
 */
@Component
public class SopMessageUtil {
    
    private static MessageSource messageSource;
    
    public SopMessageUtil(@Qualifier("sopMessageSource") MessageSource messageSource) {
        SopMessageUtil.messageSource = messageSource;
    }
    
    /**
     * Get message by code using current locale.
     */
    public static String getMessage(String code) {
        return getMessage(code, null, null);
    }
    
    /**
     * Get message by code for specific language.
     * @param code message code
     * @param language language code: "zh", "en"
     */
    public static String getMessage(String code, String language) {
        return getMessage(code, null, language);
    }
    
    /**
     * Get message by code with arguments for specific language.
     */
    public static String getMessage(String code, Object[] args, String language) {
        if (messageSource == null) {
            return code;
        }
        
        Locale locale;
        if ("en".equalsIgnoreCase(language) || "english".equalsIgnoreCase(language)) {
            locale = Locale.ENGLISH;
        } else if ("zh".equalsIgnoreCase(language) || "chinese".equalsIgnoreCase(language)) {
            locale = Locale.CHINESE;
        } else {
            locale = LocaleContextHolder.getLocale();
        }
        
        try {
            return messageSource.getMessage(code, args, code, locale);
        } catch (Exception e) {
            return code;
        }
    }
    
    /**
     * Get locale from language code.
     */
    public static Locale getLocale(String language) {
        if ("en".equalsIgnoreCase(language) || "english".equalsIgnoreCase(language)) {
            return Locale.ENGLISH;
        }
        return Locale.CHINESE;
    }
}
