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

import com.google.gson.JsonElement;
import java.math.BigDecimal;
import java.util.List;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.arrow.MetricsDataBuilder;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.PromVectorOrMatrix;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.util.JsonUtil;

/**
 * Processing prometheus returns a response format of type "matrix"
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
    public void parse(String resp, List<String> aliasFields, HttpProtocol http, MetricsDataBuilder metricsDataBuilder) {
        PromVectorOrMatrix promVectorOrMatrix = JsonUtil.fromJson(resp, PromVectorOrMatrix.class);
        if (promVectorOrMatrix == null){
            return;
        }
        List<PromVectorOrMatrix.Result> result = promVectorOrMatrix.getData().getResult();
        for (PromVectorOrMatrix.Result r : result) {
            for (List<Object> value : r.getValues()) {
                boolean setTimeFlag = false;
                boolean setValueFlag = false;
                for (String aliasField : aliasFields) {
                    if (!CollectUtil.assertPromRequireField(aliasField)) {
                        JsonElement jsonElement = r.getMetric().get(aliasField);
                        if (jsonElement != null) {
                            metricsDataBuilder.getArrowVectorWriter().setValue(aliasField, jsonElement.getAsString());
                        } else {
                            metricsDataBuilder.getArrowVectorWriter().setNull(aliasField);
                        }
                    } else {
                        if (CommonConstants.PROM_TIME.equals(aliasField)) {
                            for (Object o : value) {
                                if (o instanceof Double time) {
                                    metricsDataBuilder.getArrowVectorWriter().setValue(aliasField, String.valueOf(BigDecimal.valueOf(time * 1000L)));
                                    setTimeFlag = true;
                                }
                            }
                            if (!setTimeFlag) {
                                metricsDataBuilder.getArrowVectorWriter().setNull(aliasField);
                            }
                        } else {
                            for (Object o : value) {
                                if (o instanceof String str) {
                                    metricsDataBuilder.getArrowVectorWriter().setValue(aliasField, str);
                                    setValueFlag = true;
                                }
                            }
                            if (!setValueFlag) {
                                metricsDataBuilder.getArrowVectorWriter().setNull(aliasField);
                            }
                        }
                    }
                }
            }

        }
    }
}
