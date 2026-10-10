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

package org.apache.hertzbeat.ai.gateway.contract;

import java.util.List;
import java.util.Locale;
import org.springframework.util.StringUtils;

/**
 * Resolves model response languages against the locales supported by the HertzBeat WebUI.
 */
public final class AgentResponseLanguage {

    public static final String DEFAULT = "en-US";

    private static final List<Locale> SUPPORTED = List.of(
            Locale.forLanguageTag("en-US"),
            Locale.forLanguageTag("zh-CN"),
            Locale.forLanguageTag("zh-TW"),
            Locale.forLanguageTag("ja-JP"),
            Locale.forLanguageTag("pt-BR"));

    private AgentResponseLanguage() {
    }

    public static String fromAcceptLanguage(String acceptLanguage) {
        if (StringUtils.hasText(acceptLanguage)) {
            try {
                Locale matched = Locale.lookup(Locale.LanguageRange.parse(acceptLanguage), SUPPORTED);
                if (matched != null) {
                    return matched.toLanguageTag();
                }
            } catch (IllegalArgumentException ignored) {
                // Malformed external headers fall back to the configured system locale.
            }
        }
        return systemDefault();
    }

    public static String systemDefault() {
        Locale matched = Locale.lookup(
                Locale.LanguageRange.parse(Locale.getDefault().toLanguageTag()), SUPPORTED);
        return matched == null ? DEFAULT : matched.toLanguageTag();
    }
}
