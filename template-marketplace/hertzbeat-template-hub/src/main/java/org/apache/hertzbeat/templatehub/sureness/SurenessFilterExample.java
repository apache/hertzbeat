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

package org.apache.hertzbeat.templatehub.sureness;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usthe.sureness.mgt.SurenessSecurityManager;
import com.usthe.sureness.processor.exception.*;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.hertzbeat.templatehub.sureness.processor.RefreshExpiredTokenException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import jakarta.servlet.*;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.PrintWriter;
import java.lang.reflect.Field;
import java.util.Collections;
import java.util.Map;

@Order(1)
@Component
@WebFilter(filterName = "SurenessFilterExample", urlPatterns = "/*", asyncSupported = true)
public class SurenessFilterExample implements Filter {

    /** logger **/
    private static final Logger logger = LoggerFactory.getLogger(SurenessFilterExample.class);

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
//        logger.info("SurenessFilterExample init");
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
//        logger.info("SurenessFilterExample doFilter");

        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        if ("OPTIONS".equals(request.getMethod())){
            response.setStatus(200);
            response.setHeader("Access-Control-Allow-Origin","*");
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Allow-Methods", "POST, GET, PATCH, DELETE, PUT");
            response.setHeader("Access-Control-Max-Age", "3600");
            response.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, authorization,x-requested-with, *");

            try {
                // Retrieve the filters attribute from the filter chain
                Field filtersField = filterChain.getClass().getDeclaredField("filters");
                // Reflection setting attribute reachable
                filtersField.setAccessible(true);
                // Get the value of the filters attribute
                FilterConfig[] filters = (FilterConfig[]) filtersField.get(filterChain);
                // Skip the record of the number of filters
                int k = 0;
                // Traverse all filters
                for (int i = 0; i < filters.length; i++) {
                    if (filters[i] != null) {
                        // Get the filterDef attribute of the filter
                        Field filterDefField = filters[i].getClass().getDeclaredField("filterDef");
                        filterDefField.setAccessible(true);
                        // Get the class of the filter
                        Field filterClassField = filterDefField.get(filters[i]).getClass().getDeclaredField("filterClass");
                        filterClassField.setAccessible(true);
                        String filterClass = (String) filterClassField.get(filterDefField.get(filters[i]));
                        String FILTER_REFERENCE1 = "com.usthe.sureness.configuration.SurenessJakartaServletFilter";
                        String FILTER_REFERENCE2 = "org.apache.tomcat.websocket.server.WsFilter";
                        // Skip specified filter processing
                        if (FILTER_REFERENCE1.equals(filterClass)||FILTER_REFERENCE2.equals(filterClass)) {
                            filters[i] = null;
                            k++;
                            break;
                        }
                        // Attribute can be disabled
                        filterClassField.setAccessible(false);
                        filterDefField.setAccessible(false);
                    }
                }
                // Re assign the filter array and adjust it after removing the specified filter
                int index = 0;
                for (int i = 0; i < filters.length; i++) {
                    if (index == 0 && filters[i] == null) {
                        index = i;
                    } else if (index != 0 && filters[i] != null) {
                        filters[index] = filters[i];
                        filters[i] = null;
                        i = index;
                        index = 0;
                    }
                }
                // Reassignment of n value
                filtersField.setAccessible(false);
                Field n = filterChain.getClass().getDeclaredField("n");
                n.setAccessible(true);
                n.set(filterChain, n.getInt(filterChain) - k);
                n.setAccessible(false);
                logger.info("DemoOncePerRequestFilter end solving");
            } catch (Exception e) {
                logger.error("DemoOncePerRequestFilter doFilter exception ", e);
            }

            try {
                // if ok, doFilter and add subject in request
                filterChain.doFilter(servletRequest, servletResponse);
            } finally {
                SurenessContextHolder.clear();
            }
        }else if(request.getRequestURI().contains("template/localFileUpload")){
            response.setStatus(200);
            response.setHeader("Access-Control-Allow-Origin","*");
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Allow-Methods", "POST, GET, PATCH, DELETE, PUT");
            response.setHeader("Access-Control-Max-Age", "3600");
            response.setHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Accept, Authorization,authorization");
            try {
                // if ok, doFilter and add subject in request
                filterChain.doFilter(servletRequest, servletResponse);
            } finally {
                SurenessContextHolder.clear();
            }
        }
        else{
            try {
                SubjectSum subject = SurenessSecurityManager.getInstance().checkIn(servletRequest);
                // You can consider using SurenessContextHolder to bind subject in threadLocal
                // if bind, please remove it when end
                if (subject != null) {
                    SurenessContextHolder.bindSubject(subject);
                }
            } catch (IncorrectCredentialsException | UnknownAccountException | ExpiredCredentialsException e1) {
                logger.debug("this request account info is illegal, {}", e1.getMessage());
                responseWrite(ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED).body("Username or password is incorrect or expired"), servletResponse);
                return;
            } catch (DisabledAccountException | ExcessiveAttemptsException e2 ) {
                logger.debug("the account is disabled, {}", e2.getMessage());
                responseWrite(ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED).body("Account is disabled"), servletResponse);
                return;
            } catch (RefreshExpiredTokenException e4) {
                logger.debug("this account credential token is expired, return refresh value");
                Map<String, String> refreshTokenMap = Collections.singletonMap("refresh-token", e4.getMessage());
                responseWrite(ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED).body(refreshTokenMap), servletResponse);
                return;
            } catch (UnauthorizedException e5) {
                logger.debug("this account can not access this resource, {}", e5.getMessage());
                responseWrite(ResponseEntity
                        .status(HttpStatus.FORBIDDEN)
                        .body("This account has no permission to access this resource"), servletResponse);
                return;
            } catch (RuntimeException e) {
                logger.error("other exception happen: ", e);
                responseWrite(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build(),
                        servletResponse);
                return;
            }
            try {
                // if ok, doFilter and add subject in request
                filterChain.doFilter(servletRequest, servletResponse);
            } finally {
                SurenessContextHolder.clear();
            }
        }

    }

    @Override
    public void destroy() {
//        logger.info("SurenessFilterExample destroy");
    }

    /**
     * write response json data
     * @param content content
     * @param response response
     */
    private void responseWrite(ResponseEntity<?> content, ServletResponse response) {
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=utf-8");
        ((HttpServletResponse)response).setStatus(content.getStatusCodeValue());
        content.getHeaders().forEach((key, value) ->
                ((HttpServletResponse) response).addHeader(key, value.get(0)));
        try (PrintWriter printWriter = response.getWriter()) {
            if (content.getBody() != null) {
                if (content.getBody() instanceof String) {
                    printWriter.write(content.getBody().toString());
                } else {
                    ObjectMapper objectMapper = new ObjectMapper();
                    printWriter.write(objectMapper.writeValueAsString(content.getBody()));
                }
            } else {
                printWriter.flush();
            }
        } catch (IOException e) {
            logger.error("responseWrite response error: ", e);
        }
    }
}
