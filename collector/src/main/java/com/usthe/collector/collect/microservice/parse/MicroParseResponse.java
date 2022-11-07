package com.usthe.collector.collect.microservice.parse;

import com.usthe.collector.collect.AbstractParseResponse;
import com.usthe.collector.collect.http.micro.AbstractMicroParse;
import com.usthe.collector.collect.http.micro.MicroParseCreater;
import com.usthe.collector.collect.strategy.ParseStrategyFactory;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.common.entity.job.protocol.HttpProtocol;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Map;

/**
 *
 *
 * @description：微服务解析链路选择
 */
@Slf4j
public class MicroParseResponse implements AbstractParseResponse {
    @Override
    public void parseResponse(String resp,List<String> fields, List<String> aliasFields ,List<String> jsonScript, HttpProtocol http,
                              Map<String,List<String>> tempcloums,String kv) {
        AbstractMicroParse microParse = MicroParseCreater.getMicroParse();
        microParse.handle(resp,fields,aliasFields,jsonScript,http,tempcloums,kv);
    }

    @Override
    public void parseResponse(String resp,String field, String aliasField ,String jsonScript, HttpProtocol http,
                              Map<String,List<String>> tempcloums,String kv) {
        AbstractMicroParse microParse = MicroParseCreater.getMicroParse();
        microParse.handle(resp,field,aliasField,jsonScript,http,tempcloums, kv);
    }
    @Override
    public void afterPropertiesSet() throws Exception {
        ParseStrategyFactory.register(DispatchConstants.PARSE_MICRO,this);
    }
}
