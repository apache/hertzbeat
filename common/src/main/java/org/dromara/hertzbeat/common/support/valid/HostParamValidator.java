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

package org.dromara.hertzbeat.common.support.valid;

import org.dromara.hertzbeat.common.util.IpDomainUtil;

import javax.validation.ConstraintValidator;
import javax.validation.ConstraintValidatorContext;

/**
 * Host Param Validator
 * @author tomsun28
 *
 */
public class HostParamValidator implements ConstraintValidator<HostValid, String> {
    public static final String HTTP = "http://";
    public static final String HTTPS = "https://";
    public static final String BLANK = "";
    public static final String PATTERN_HTTP  = "(?i)http://";
    public static final String PATTERN_HTTPS  = "(?i)https://";

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if(value != null && value.toLowerCase().contains(HTTP)){
            value = value.replaceAll(PATTERN_HTTP, BLANK);
        }
        if(value != null && value.toLowerCase().contains(HTTPS)){
            value = value.replace(PATTERN_HTTPS, BLANK);
        }
        return IpDomainUtil.validateIpDomain(value);
    }
}
