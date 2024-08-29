package org.apache.hertzbeat.templatehub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableTransactionManagement
public class HertzbeatTemplateHubApplication {

	public static void main(String[] args) {
		SpringApplication.run(HertzbeatTemplateHubApplication.class, args);
	}

}
