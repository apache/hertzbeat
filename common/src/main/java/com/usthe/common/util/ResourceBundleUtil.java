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

package com.usthe.common.util;

import com.usthe.common.support.ResourceBundleUtf8Control;
import lombok.extern.slf4j.Slf4j;

import java.util.Locale;
import java.util.MissingResourceException;
import java.util.ResourceBundle;

/**
 * i18n ResourceBundle util
 * @author tom
 * @date 2022/5/18 08:30
 */
@Slf4j
public class ResourceBundleUtil {

    /**
     * 根据bundle name 获取 resource bundle
     * @param bundleName bundle name
     * @return resource bundle
     */
    public static ResourceBundle getBundle(String bundleName) {
        try {
            return ResourceBundle.getBundle(bundleName, new ResourceBundleUtf8Control());
        } catch (MissingResourceException resourceException) {
            return ResourceBundle.getBundle(bundleName, Locale.US, new ResourceBundleUtf8Control());
        }
    }

}
