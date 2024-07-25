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

import java.util.Locale;
import java.util.MissingResourceException;
import java.util.ResourceBundle;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.support.ResourceBundleUtf8Control;

/**
 * i18n ResourceBundle util
 */
@Slf4j
public final class ResourceBundleUtil {

    private static final ResourceBundleUtf8Control BUNDLE_UTF_8_CONTROL = new ResourceBundleUtf8Control();
    private static final Integer LANG_REGION_LENGTH = 2;

    static {
        // set default locale by env
        try {
            String langEnv = System.getenv("LANG");
            if (langEnv != null) {
                String[] langArr = langEnv.split("\\.");
                if (langArr.length >= 1) {
                    String[] regionArr = langArr[0].split("_");
                    if (regionArr.length == LANG_REGION_LENGTH) {
                        String language = regionArr[0];
                        String region = regionArr[1];
                        Locale locale = new Locale(language, region);
                        Locale.setDefault(locale);
                    }
                }
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    private ResourceBundleUtil() {
    }

    /**
     * get resource bundle by bundle name
     * @param bundleName bundle name
     * @return resource bundle
     */
    public static ResourceBundle getBundle(String bundleName) {
        try {
            return ResourceBundle.getBundle(bundleName, BUNDLE_UTF_8_CONTROL);
        } catch (MissingResourceException resourceException) {
            return ResourceBundle.getBundle(bundleName, Locale.US, BUNDLE_UTF_8_CONTROL);
        }
    }

}
