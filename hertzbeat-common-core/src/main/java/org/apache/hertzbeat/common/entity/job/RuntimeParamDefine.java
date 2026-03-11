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

package org.apache.hertzbeat.common.entity.job;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Framework-agnostic parameter definition used by runtime templates and jobs.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RuntimeParamDefine {

    private String app;

    private Map<String, String> name;

    private String field;

    private String type;

    private boolean required = false;

    private String defaultValue;

    private String placeholder;

    private String range;

    private Short limit;

    private List<Option> options;

    private String keyAlias;

    private String valueAlias;

    private boolean hide = false;

    private Map<String, List<Object>> depend;

    /**
     * Runtime option definition.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static final class Option {

        private String label;

        private String value;
    }
}
