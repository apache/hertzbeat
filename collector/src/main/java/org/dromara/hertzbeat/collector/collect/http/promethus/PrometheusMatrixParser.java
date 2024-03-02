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

package org.dromara.hertzbeat.collector.collect.http.promethus;

import com.google.gson.JsonElement;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.collector.util.CollectUtil;
import org.dromara.hertzbeat.common.entity.dto.PromVectorOrMatrix;
import org.dromara.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.util.JsonUtil;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * @author myth
 *
 * 处理prometheus返回类型为“matrix”的响应格式
 */
@NoArgsConstructor
public class PrometheusMatrixParser extends AbstractPrometheusParse {
    @Override
    public Boolean checkType(String responseStr) {
        try {
            PromVectorOrMatrix promVectorOrMatrix = JsonUtil.fromJson(responseStr, PromVectorOrMatrix.class);
            if (promVectorOrMatrix != null && promVectorOrMatrix.getData() != null) {
                return DispatchConstants.PARSE_PROM_QL_MATRIX.equals(promVectorOrMatrix.getData().getResultType());
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void parse(String resp, List<String> aliasFields, HttpProtocol http, CollectRep.MetricsData.Builder builder) {
        PromVectorOrMatrix promVectorOrMatrix = JsonUtil.fromJson(resp, PromVectorOrMatrix.class);
        if (promVectorOrMatrix == null){
            return;
        }
        List<PromVectorOrMatrix.Result> result = promVectorOrMatrix.getData().getResult();
        for (PromVectorOrMatrix.Result r : result) {
            for (List<Object> value : r.getValues()) {
                boolean setTimeFlag = false;
                boolean setValueFlag = false;
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String aliasField : aliasFields) {
                    if (!CollectUtil.assertPromRequireField(aliasField)) {
                        JsonElement jsonElement = r.getMetric().get(aliasField);
                        if (jsonElement != null) {
                            valueRowBuilder.addColumns(jsonElement.getAsString());
                        } else {
                            valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                        }
                    } else {
                        if (CommonConstants.PROM_TIME.equals(aliasField)) {
                            for (Object o : value) {
                                if (o instanceof Double) {
                                    valueRowBuilder.addColumns(String.valueOf(BigDecimal.valueOf((Double) o * 1000)));
                                    setTimeFlag = true;
                                }
                            }
                            if (!setTimeFlag) {
                                valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                            }
                        } else {
                            for (Object o : value) {
                                if (o instanceof String) {
                                    valueRowBuilder.addColumns((String) o);
                                    setValueFlag = true;
                                }
                            }
                            if (!setValueFlag) {
                                valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                            }
                        }
                    }
                }
                builder.addValues(valueRowBuilder);
            }

        }
    }
}
