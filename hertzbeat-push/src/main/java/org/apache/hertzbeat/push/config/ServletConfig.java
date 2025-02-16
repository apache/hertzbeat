package org.apache.hertzbeat.push.config;

import org.apache.hertzbeat.push.controller.MyServlet;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ServletConfig {

    @Bean
    public ServletRegistrationBean<MyServlet> customServlet() {
        return new ServletRegistrationBean<>(new MyServlet(), "/api/push/pushgateway");
    }
}
