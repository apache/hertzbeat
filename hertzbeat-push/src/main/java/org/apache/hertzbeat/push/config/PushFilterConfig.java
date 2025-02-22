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

    @Bean
    public FilterRegistrationBean<PushGatewayStreamReadingFilter> contentTypeFilter() {
        FilterRegistrationBean<PushGatewayStreamReadingFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new PushGatewayStreamReadingFilter(pushGatewayService));
        registrationBean.addUrlPatterns("/api/push/pushgateway1");
        registrationBean.setOrder(Integer.MIN_VALUE);
        return registrationBean;
    }
}
