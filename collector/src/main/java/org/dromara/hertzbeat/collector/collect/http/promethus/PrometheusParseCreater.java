package org.dromara.hertzbeat.collector.collect.http.promethus;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

/**
 * @author myth
 *
 */
@Slf4j
@Component
public class PrometheusParseCreater implements InitializingBean {
    private static AbstractPrometheusParse PROMETHEUSPARSE = new PrometheusVectorParser();

    private static void create() {
        PROMETHEUSPARSE.setInstance(new PrometheusMatrixParser().setInstance(new PrometheusLastParser()));
    }
    public static AbstractPrometheusParse getPrometheusParse(){
        return PROMETHEUSPARSE;
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        create();
    }
}
