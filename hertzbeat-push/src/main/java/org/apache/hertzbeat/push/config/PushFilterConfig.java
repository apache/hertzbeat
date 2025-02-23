package org.apache.hertzbeat.push.config;

import org.apache.hertzbeat.push.service.PushGatewayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 *
 */
@Configuration
public class PushFilterConfig {

    @Autowired
    private PushGatewayService pushGatewayService;

    private static final String URI_PREFIX = "/api/push/prometheus/*";

    @Bean
    public FilterRegistrationBean<PushPrometheusStreamReadingFilter> contentTypeFilter() {
        FilterRegistrationBean<PushPrometheusStreamReadingFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new PushPrometheusStreamReadingFilter(pushGatewayService));
        registrationBean.addUrlPatterns(URI_PREFIX);
        registrationBean.setOrder(Integer.MIN_VALUE);
        return registrationBean;
    }
}
