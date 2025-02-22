package org.apache.hertzbeat.push.config;

import org.apache.hertzbeat.push.service.PushGatewayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 *
 */
@Configuration
public class PushFilterConfig {

    @Autowired
    private PushGatewayService pushGatewayService;

    private static final String URI_PREFIX = "/api/push/pushgateway/*";
    public static final String URI_REGEX = "^/api/push/pushgateway/(\\w+)$";

    public static Pattern uri_pattern;

    PushFilterConfig() {
        uri_pattern = Pattern.compile(URI_REGEX);
    }

    @Bean
    public FilterRegistrationBean<PushGatewayStreamReadingFilter> contentTypeFilter() {
        FilterRegistrationBean<PushGatewayStreamReadingFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new PushGatewayStreamReadingFilter(pushGatewayService));
        registrationBean.addUrlPatterns(URI_PREFIX);
        registrationBean.setOrder(Integer.MIN_VALUE);
        return registrationBean;
    }
}
