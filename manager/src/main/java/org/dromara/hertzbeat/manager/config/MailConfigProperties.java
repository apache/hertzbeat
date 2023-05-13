package org.dromara.hertzbeat.manager.config;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

import java.util.Properties;

/**
 *
        * @author zqr
        * @date 2023/5/7 23:31
        * @version 1.0
        */

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "spring.mail")
public class MailConfigProperties {
    private String host;
    private String username;
    private String password;
    private Integer port;
    private String defaultEncoding;

    @Bean
    public JavaMailSender javaMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(host);
        mailSender.setPort(port);
        mailSender.setUsername(username);
        mailSender.setPassword(password);

        Properties props = mailSender.getJavaMailProperties();
        props.put("spring.mail.smtp.ssl.enable", "true");
        props.put("spring.mail.smtp.socketFactory.port", port);
        props.put("spring.mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
        props.put("spring.mail.debug", "false");
        props.put("spring.mail.default-encoding", defaultEncoding);

        return mailSender;
    }
}
