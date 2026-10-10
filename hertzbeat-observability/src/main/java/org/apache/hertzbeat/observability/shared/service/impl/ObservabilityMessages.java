/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.shared.service.impl;

import java.text.MessageFormat;
import java.util.MissingResourceException;
import org.apache.hertzbeat.common.util.ResourceBundleUtil;

/**
 * Localized backend copy for observability DTOs.
 */
final class ObservabilityMessages {

    private static final String BUNDLE_NAME = "observability";

    private ObservabilityMessages() {
    }

    static String get(String key) {
        try {
            return ResourceBundleUtil.getBundle(BUNDLE_NAME).getString(key);
        } catch (MissingResourceException exception) {
            return key;
        }
    }

    static String format(String key, Object... args) {
        return MessageFormat.format(get(key), args);
    }
}
