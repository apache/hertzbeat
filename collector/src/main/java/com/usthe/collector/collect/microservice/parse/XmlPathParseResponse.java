package com.usthe.collector.collect.microservice.parse;

import com.usthe.collector.collect.AbstractParseResponse;
import com.usthe.collector.collect.strategy.ParseStrategyFactory;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.common.entity.job.protocol.HttpProtocol;
import com.usthe.common.entity.message.CollectRep;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

/**
 * @author ：myth
 * @date ：Created 2022/7/15 9:28
 * @description：
 */
@Slf4j
public class XmlPathParseResponse implements AbstractParseResponse {
    @Override
    public void parseResponse(String resp, List<String> aliasFields, HttpProtocol http,
                              CollectRep.MetricsData.Builder builder, Long responseTime) {

    }

    @Override
    public void afterPropertiesSet() throws Exception {
        ParseStrategyFactory.register(DispatchConstants.PARSE_XML_PATH, this);
    }
}
