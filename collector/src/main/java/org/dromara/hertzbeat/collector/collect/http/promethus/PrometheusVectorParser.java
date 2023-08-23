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
 * 处理prometheus返回类型为“vector”的响应格式
 */
@NoArgsConstructor
public class PrometheusVectorParser extends AbstractPrometheusParse {
    @Override
    public Boolean checkType(String responseStr) {
        try {
            PromVectorOrMatrix promVectorOrMatrix = JsonUtil.fromJson(responseStr, PromVectorOrMatrix.class);
            if (promVectorOrMatrix != null && promVectorOrMatrix.getData() != null) {
                return DispatchConstants.PARSE_PROM_QL_VECTOR.equals(promVectorOrMatrix.getData().getResultType());
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void parse(String resp, List<String> aliasFields, HttpProtocol http, CollectRep.MetricsData.Builder builder) {
        boolean setTimeFlag = false;
        boolean setValueFlag = false;
        PromVectorOrMatrix promVectorOrMatrix = JsonUtil.fromJson(resp, PromVectorOrMatrix.class);
        if (promVectorOrMatrix == null){
            return;
        }
        List<PromVectorOrMatrix.Result> result = promVectorOrMatrix.getData().getResult();
        for (PromVectorOrMatrix.Result r : result) {
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
                        for (Object o : r.getValue()) {
                            if (o instanceof Double) {
                                valueRowBuilder.addColumns(String.valueOf(BigDecimal.valueOf((Double) o * 1000)));
                                setTimeFlag = true;
                            }
                        }
                        if (!setTimeFlag) {
                            valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                        }
                    } else {
                        for (Object o : r.getValue()) {
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
