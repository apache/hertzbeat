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

package org.apache.hertzbeat.common.entity.job.protocol;

import static org.apache.hertzbeat.common.util.IpDomainUtil.isHasSchema;
import static org.apache.hertzbeat.common.util.IpDomainUtil.validPort;
import static org.apache.hertzbeat.common.util.IpDomainUtil.validateIpDomain;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.Field;

/**
 * push protocol definition
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PushProtocol implements CommonRequestProtocol, Protocol {
    private String host;
    private String port;
    private String uri = "/api/push";
    private List<Field> fields;

    @Override
    public boolean isInvalid() {
        if ((!validateIpDomain(host) && !isHasSchema(host)) || !validPort(port)) {
            return true;
        }
        if (Integer.parseInt(port) <= 0) {
            return true;
        }
        if (StringUtils.isBlank(uri) || !uri.startsWith("/") || StringUtils.containsWhitespace(uri)) {
            return true;
        }
        if (fields == null || fields.isEmpty()) {
            return true;
        }
        for (Field field : fields) {
            if (field == null
                    || StringUtils.isBlank(field.getName())
                    || field.getType() == null
                    || (field.getType() != 0 && field.getType() != 1)) {
                return true;
            }
        }
        return false;
    }
}
