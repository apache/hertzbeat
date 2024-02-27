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

package org.dromara.hertzbeat.common.entity.job;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Monitoring configuration parameter properties and values
 * During the process, you need to replace the content with the identifier ^_^key^_^
 * in the protocol configuration parameter with the real value in the configuration parameter
 * @author tomsun28
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Configmap {

    /**
     * Parameter key, replace the content with the identifier ^^_key_^^ in the protocol
     * configuration parameter with the real value in the configuration parameter
     * <p>
     * 参数key,将协议配置参数里面的标识符为^^_key_^^的内容替换为配置参数里的真实值
     */
    private String key;

    /**
     * parameter value  参数value
     */
    private Object value;

    /**
     * Parameter type 0: number 1: string 2: encrypted string 3: json string mapped by map
     * 参数类型 0:数字 1:字符串 2:加密串 3:map映射的json串 4:arrays string
     * number,string,secret
     * 数字,非加密字符串,加密字符串
     */
    private byte type = 1;
}
