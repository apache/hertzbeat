package com.usthe.collector.collect.http.micro;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

/**
 *
 *
 * @description： 微服务链路拼装
 */
@Slf4j
@Component
public class MicroParseCreater implements InitializingBean {
    private static AbstractMicroParse microParse = new MicroRequestsParse();

    private static void create() {
        microParse.setInstance(new MicroCommonParse().setInstance(new MicroLastParser()));
    }
    public static AbstractMicroParse getMicroParse(){
        return microParse;
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        create();
    }
}
