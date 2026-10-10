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

package org.apache.hertzbeat.manager.config;

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
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;

/**
 * Spring Framework 7 compatible servlet boundary for Sureness 1.1.0.
 *
 * <p>The released Sureness filter calls the removed
 * {@code ResponseEntity.getStatusCodeValue()} method while handling rejected requests. This adapter keeps the
 * starter-managed {@link SecurityManager} and writes the same status and challenge headers directly to the servlet
 * response until an upstream release supports Spring Framework 7.</p>
 */
public final class SurenessSpring7ServletFilter implements Filter {

    private static final Logger LOGGER = LoggerFactory.getLogger(SurenessSpring7ServletFilter.class);
    private static final String WEBSOCKET = "websocket";
    private static final String INVALID_CREDENTIALS_BODY =
            "Username or password is incorrect or token expired";
    private static final String DISABLED_ACCOUNT_BODY = "Account is disabled";
    private static final String UNAUTHORIZED_BODY = "This account has no permission to access this resource";

    private final SecurityManager securityManager;

    public SurenessSpring7ServletFilter(SecurityManager securityManager) {
        this.securityManager = securityManager;
    }

    @Override
    public void init(FilterConfig filterConfig) {
        LOGGER.info("Spring 7 compatible Sureness servlet filter initialized");
    }

    @Override
    public void destroy() {
        LOGGER.info("Spring 7 compatible Sureness servlet filter destroyed");
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        HttpServletResponse response = (HttpServletResponse) servletResponse;
        SurenessContextHolder.clear();
        try {
            SubjectSum subject = securityManager.checkIn(servletRequest);
            if (subject != null) {
                SurenessContextHolder.bindSubject(subject);
            }
        } catch (IncorrectCredentialsException | UnknownAccountException | ExpiredCredentialsException exception) {
            LOGGER.debug("Sureness rejected invalid or expired credentials");
            writeResponse(response, HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS_BODY);
            return;
        } catch (DisabledAccountException | ExcessiveAttemptsException exception) {
            LOGGER.debug("Sureness rejected an unavailable account");
            writeResponse(response, HttpStatus.UNAUTHORIZED, DISABLED_ACCOUNT_BODY);
            return;
        } catch (NeedDigestInfoException exception) {
            LOGGER.debug("Sureness requires a digest authentication challenge");
            response.addHeader(HttpHeaders.WWW_AUTHENTICATE, exception.getAuthenticate());
            writeStatus(response, HttpStatus.UNAUTHORIZED);
            return;
        } catch (UnauthorizedException exception) {
            LOGGER.debug("Sureness rejected an unauthorized account");
            writeResponse(response, HttpStatus.FORBIDDEN, UNAUTHORIZED_BODY);
            return;
        } catch (RuntimeException exception) {
            LOGGER.error("Unexpected Sureness authentication failure");
            writeStatus(response, HttpStatus.INTERNAL_SERVER_ERROR);
            return;
        }

        try {
            filterChain.doFilter(servletRequest, servletResponse);
        } finally {
            if (response.getStatus() != HttpStatus.SWITCHING_PROTOCOLS.value()
                    || !WEBSOCKET.equals(response.getHeader(HttpHeaders.UPGRADE))) {
                SurenessContextHolder.clear();
            }
        }
    }

    private static void writeStatus(HttpServletResponse response, HttpStatus status) {
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setStatus(status.value());
    }

    private static void writeResponse(HttpServletResponse response, HttpStatus status, String body) {
        writeStatus(response, status);
        try {
            response.getWriter().write(body);
        } catch (IOException exception) {
            LOGGER.error("Failed to write Sureness rejection response");
        }
    }
}
