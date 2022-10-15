package com.usthe.collector.collect.http.promethus;

import com.usthe.common.entity.job.protocol.HttpProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

/**
 * @author myth
 * @date 2022-07-06-18:26
 */
@Slf4j
@NoArgsConstructor
public class PrometheusLastParser extends AbstractPrometheusParse {
    @Override
    public Boolean checkType(String responseStr) {
        log.error("prometheus response data:{} ,no adaptive parser",responseStr);
       return true;
    }

    @Override
    public void parse(String resp, List<String> aliasFields, HttpProtocol http, CollectRep.MetricsData.Builder builder) {
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (String aliasField : aliasFields) {
            valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
        }
    }
}
