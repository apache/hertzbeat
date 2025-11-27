/*
 *   Licensed to the Apache Software Foundation (ASF) under one or more
 *   contributor license agreements.  See the NOTICE file distributed with
 *   this work for additional information regarding copyright ownership.
 *   The ASF licenses this file to You under the Apache License, Version 2.0
 *   (the "License"); you may not use this file except in compliance with
 *   the License.  You may obtain a copy of the License at
 *  
 *       http://www.apache.org/licenses/LICENSE-2.0
 *  
 *  Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package com.usthe.sureness.configuration;

import com.usthe.sureness.mgt.SecurityManager;
import com.usthe.sureness.processor.exception.DisabledAccountException;
import com.usthe.sureness.processor.exception.ExcessiveAttemptsException;
import com.usthe.sureness.processor.exception.ExpiredCredentialsException;
import com.usthe.sureness.processor.exception.IncorrectCredentialsException;
import com.usthe.sureness.processor.exception.NeedDigestInfoException;
import com.usthe.sureness.processor.exception.UnauthorizedException;
import com.usthe.sureness.processor.exception.UnknownAccountException;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;


/**
 * @author wangtao
 * @date 2021/7/8
 */
public class SurenessJakartaServletFilter implements Filter {

    private final SecurityManager securityManager;

    public SurenessJakartaServletFilter(SecurityManager securityManager) {
        this.securityManager = securityManager;
    }

    /** logger **/
    private static final Logger logger = LoggerFactory.getLogger(SurenessJakartaServletFilter.class);

    private static final String UPGRADE = "Upgrade";

    private static final String WEBSOCKET = "websocket";

    @Override
    public void init(FilterConfig filterConfig) {
        logger.info("servlet surenessFilter initialized");
    }

    @Override
    public void destroy() {
        logger.info("servlet surenessFilter destroyed");
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse,
                         FilterChain filterChain)
            throws IOException, ServletException {

        try {
            SubjectSum subject = securityManager.checkIn(servletRequest);
            // You can consider using SurenessContextHolder to bind subject in threadLocal
            // if bind, please remove it when end
            if (subject != null) {
                SurenessContextHolder.bindSubject(subject);
            }
        } catch (IncorrectCredentialsException | UnknownAccountException | ExpiredCredentialsException e1) {
            logger.debug("this request account info is illegal, {}", e1.getMessage());
            responseWrite(ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("Username or password is incorrect or token expired"), servletResponse);
            return;
        } catch (DisabledAccountException | ExcessiveAttemptsException e2 ) {
            logger.debug("the account is disabled, {}", e2.getMessage());
            responseWrite(ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED).body("Account is disabled"), servletResponse);
            return;
        } catch (NeedDigestInfoException e3) {
            logger.debug("you should try once again with digest auth information");
            responseWrite(ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .header("WWW-Authenticate", e3.getAuthenticate()).build(), servletResponse);
            return;
        } catch (UnauthorizedException e4) {
            logger.debug("this account can not access this resource, {}", e4.getMessage());
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
            int statusCode = ((HttpServletResponse) servletResponse).getStatus();
            String upgrade = ((HttpServletResponse) servletResponse).getHeader(UPGRADE);
            if (statusCode != HttpStatus.SWITCHING_PROTOCOLS.value() || !WEBSOCKET.equals(upgrade)) {
                SurenessContextHolder.clear();
            }
        }
    }

    /**
     * write response json data
     * @param content content
     * @param response response
     */
    private static void responseWrite(ResponseEntity content, ServletResponse response) {
        response.setCharacterEncoding("UTF-8");
        ((HttpServletResponse)response).setStatus(content.getStatusCode().value());
        content.getHeaders().forEach((key, value) ->
                ((HttpServletResponse) response).addHeader(key, value.get(0)));
        try (PrintWriter printWriter = response.getWriter()) {
            if (content.getBody() != null) {
                printWriter.write(content.getBody().toString());
            } else {
                printWriter.flush();
            }
        } catch (IOException e) {
            logger.error("responseWrite response error: ", e);
        }
    }
}
