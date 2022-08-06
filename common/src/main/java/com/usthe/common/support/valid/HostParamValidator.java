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

package com.usthe.common.support.valid;

import com.usthe.common.util.IpDomainUtil;

import javax.validation.ConstraintValidator;
import javax.validation.ConstraintValidatorContext;

/**
 * host注解数据自定义校验器
 * @author tomsun28
 * @date 2021/11/17 19:44
 */
public class HostParamValidator implements ConstraintValidator<HostValid, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // 判断value是否满足ipv4 ipv5 域名 格式
        return IpDomainUtil.validateIpDomain(value);
    }
}
