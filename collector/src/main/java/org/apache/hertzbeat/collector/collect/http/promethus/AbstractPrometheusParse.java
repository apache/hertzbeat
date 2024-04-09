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

package org.apache.hertzbeat.collector.collect.http.promethus;

import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;

import java.util.List;

/**
 * prometheus parse abstract class
 * todo: string类型 和 scalar类型 响应格式解析
 */
public abstract class AbstractPrometheusParse {

    /**
     * Downstream node
     */
    private AbstractPrometheusParse prometheusParse;

    AbstractPrometheusParse() {
    }

    public AbstractPrometheusParse setInstance(AbstractPrometheusParse prometheusParse) {
        this.prometheusParse = prometheusParse;
        return this;
    }

    /**
     * prom response type check: string, matrix, vector, scalar
     * todo：string、scalar类型响应未实现
     * @param responseStr 返回字符串
     * @return return
     */
    abstract Boolean checkType(String responseStr);

    /**
     * Parse the prom interface response data
     * @param resp 返回数据
     * @param aliasFields alias fields
     * @param http httpProtocol
     * @param builder builder
     */
    abstract void parse(String resp, List<String> aliasFields, HttpProtocol http,
                        CollectRep.MetricsData.Builder builder);

    /**
     * Processing prom interface response data
     * @param resp resp
     * @param aliasFields alias fields
     * @param http http
     * @param builder builder
     */
    public void handle(String resp, List<String> aliasFields, HttpProtocol http,
                       CollectRep.MetricsData.Builder builder) {
        if (checkType(resp)) {
            parse(resp, aliasFields, http,
                    builder);
        } else {
            prometheusParse.handle(resp, aliasFields, http,
                    builder);
        }
    }


}
