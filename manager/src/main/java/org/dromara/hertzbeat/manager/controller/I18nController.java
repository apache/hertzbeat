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

package org.dromara.hertzbeat.manager.controller;

import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.manager.service.AppService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Internationalization I 18 N
 * 国际化I18N
 * @author tom
 *
 */
@Tag(name = "I18N API | I18N国际化资源API")
@RestController
@RequestMapping(path = "/api/i18n", produces = {APPLICATION_JSON_VALUE})
public class I18nController {

    @Autowired
    private AppService appService;

    @GetMapping("/{lang}")
    @Operation(summary = "Query total i 18 n internationalized text resources", description = "查询总的i18n国际化文本资源")
    public ResponseEntity<Message<Map<String, String>>> queryI18n(
            @Parameter(description = "en: language type,zh: 语言类型", example = "zh-CN")
            @PathVariable(name = "lang", required = false) String lang) {
        if (lang == null || lang.isEmpty()) {
            lang = "zh-CN";
        }
        lang = "zh-cn".equalsIgnoreCase(lang) || "zh_cn".equalsIgnoreCase(lang) ? "zh-CN" : lang;
        lang = "en-us".equalsIgnoreCase(lang) || "en_us".equalsIgnoreCase(lang) ? "en-US" : lang;
        Map<String, String> i18nResource = appService.getI18nResources(lang);
        return ResponseEntity.ok(Message.success(i18nResource));
    }
}
