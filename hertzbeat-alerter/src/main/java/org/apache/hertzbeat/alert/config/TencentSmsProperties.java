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

package org.apache.hertzbeat.alert.config;

import lombok.Data;

/**
 * Tencent Cloud SMS properties
 */
@Data
public class TencentSmsProperties {
    /**
     * Tencent cloud account secret id
     */
    private String secretId;

    /**
     * Tencent cloud account secret key
     */
    private String secretKey;

    /**
     * SMS app id
     */
    private String appId;

    /**
     * SMS signature
     */
    private String signName;

    /**
     * SMS template ID
     */
    private String templateId;
}