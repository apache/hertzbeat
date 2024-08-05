/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.alert.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.SpringDataJacksonConfiguration;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

/**
 * Jackson2Object configuration.
 * Fix: Resolved [org.springframework.http.converter.HttpMessageNotWritableException:
 * 		Could not write JSON: (was java.lang.UnsupportedOperationException)]
 * From: <a href="https://github.com/spring-projects/spring-data-commons/issues/2987#issuecomment-2072480592">...</a>
 */

@Configuration
public class JacksonConfiguration {

	@Bean
	public Jackson2ObjectMapperBuilder jackson2ObjectMapperBuilder(SpringDataJacksonConfiguration.PageModule pageModule) {

		return new Jackson2ObjectMapperBuilder().modules(pageModule);
	}

}
