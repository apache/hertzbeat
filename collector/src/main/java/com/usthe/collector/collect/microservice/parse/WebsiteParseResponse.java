package com.usthe.collector.collect.microservice.parse;

import com.usthe.collector.collect.AbstractParseResponse;
import com.usthe.collector.collect.strategy.ParseStrategyFactory;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.collector.util.CollectUtil;
import com.usthe.collector.util.CollectorConstants;
import com.usthe.common.entity.job.protocol.HttpProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

/**
 *
 *
 * @description：
 */
@Slf4j
public class WebsiteParseResponse implements AbstractParseResponse {
    @Override
    public void parseResponse(String resp, List<String> aliasFields, HttpProtocol http,
                              CollectRep.MetricsData.Builder builder, Long responseTime) {
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        // 网站关键词数量监测
        int keywordNum = CollectUtil.countMatchKeyword(resp, http.getKeyword());
        for (String alias : aliasFields) {
            if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                valueRowBuilder.addColumns(responseTime.toString());
            } else if (CollectorConstants.KEYWORD.equalsIgnoreCase(alias)) {
                valueRowBuilder.addColumns(Integer.toString(keywordNum));
            } else {
                valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
            }
        }
        builder.addValues(valueRowBuilder.build());
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        ParseStrategyFactory.register(DispatchConstants.PARSE_WEBSITE, this);
    }
}
