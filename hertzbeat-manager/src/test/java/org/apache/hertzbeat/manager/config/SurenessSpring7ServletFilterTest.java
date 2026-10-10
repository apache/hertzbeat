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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
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
import jakarta.servlet.FilterChain;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SurenessSpring7ServletFilterTest {

    private static final String SECRET_SENTINEL = "secret-token-sentinel";
    private static final String INVALID_CREDENTIALS_BODY =
            "Username or password is incorrect or token expired";
    private static final String DISABLED_ACCOUNT_BODY = "Account is disabled";
    private static final String UNAUTHORIZED_BODY = "This account has no permission to access this resource";

    private final SecurityManager securityManager = mock(SecurityManager.class);
    private final SurenessSpring7ServletFilter filter = new SurenessSpring7ServletFilter(securityManager);

    @AfterEach
    void clearSubject() {
        SurenessContextHolder.clear();
    }

    @ParameterizedTest
    @MethodSource("invalidCredentials")
    void invalidCredentialsReturnSafeLegacyUnauthorizedResponse(RuntimeException exception) {
        assertErrorResponse(exception, HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS_BODY);
    }

    private static Stream<Arguments> invalidCredentials() {
        return Stream.of(
                Arguments.of(new IncorrectCredentialsException("incorrect")),
                Arguments.of(new ExpiredCredentialsException("expired")),
                Arguments.of(new UnknownAccountException("unknown")));
    }

    @ParameterizedTest
    @MethodSource("unavailableAccounts")
    void unavailableAccountsReturnSafeLegacyUnauthorizedResponse(RuntimeException exception) {
        assertErrorResponse(exception, HttpStatus.UNAUTHORIZED, DISABLED_ACCOUNT_BODY);
    }

    private static Stream<Arguments> unavailableAccounts() {
        return Stream.of(
                Arguments.of(new DisabledAccountException("disabled")),
                Arguments.of(new ExcessiveAttemptsException("excessive")));
    }

    @Test
    void digestChallengeReturnsEmptyUnauthorizedResponseWithAuthenticateHeader() throws Exception {
        when(securityManager.checkIn(any()))
                .thenThrow(new NeedDigestInfoException("challenge required", "Digest realm=\"hertzbeat\""));
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(new MockHttpServletRequest(), response, chain);

        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(response.getHeader(HttpHeaders.WWW_AUTHENTICATE)).isEqualTo("Digest realm=\"hertzbeat\"");
        assertThat(response.getContentAsByteArray()).isEmpty();
        verifyNoInteractions(chain);
    }

    @Test
    void unauthorizedRoleReturnsSafeLegacyForbiddenResponse() {
        assertErrorResponse(new UnauthorizedException("forbidden"), HttpStatus.FORBIDDEN, UNAUTHORIZED_BODY);
    }

    @Test
    void unexpectedRuntimeFailureReturnsEmptyInternalServerError() {
        assertErrorResponse(new IllegalStateException("unexpected"), HttpStatus.INTERNAL_SERVER_ERROR, "");
    }

    @ParameterizedTest
    @MethodSource("authenticationFailures")
    void authenticationFailureClearsPreviouslyBoundSubject(RuntimeException exception) throws Exception {
        SurenessContextHolder.bindSubject(mock(SubjectSum.class));
        when(securityManager.checkIn(any())).thenThrow(exception);

        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), mock(FilterChain.class));

        assertThat(SurenessContextHolder.getBindSubject()).isNull();
    }

    private static Stream<Arguments> authenticationFailures() {
        return Stream.of(
                Arguments.of(new IncorrectCredentialsException("invalid")),
                Arguments.of(new DisabledAccountException("disabled")),
                Arguments.of(new NeedDigestInfoException("digest", "Digest realm=\"hertzbeat\"")),
                Arguments.of(new UnauthorizedException("forbidden")),
                Arguments.of(new IllegalStateException("unexpected")));
    }

    @Test
    void authenticationFailureLogsAndBodiesNeverExposeExceptionSecrets() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(SurenessSpring7ServletFilter.class);
        Level previousLevel = logger.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.DEBUG);
        try {
            when(securityManager.checkIn(any()))
                    .thenThrow(new IncorrectCredentialsException(SECRET_SENTINEL))
                    .thenThrow(new IllegalStateException(SECRET_SENTINEL));

            MockHttpServletResponse invalidCredentials = filterOnce();
            MockHttpServletResponse runtimeFailure = filterOnce();

            assertThat(invalidCredentials.getContentAsString())
                    .isEqualTo(INVALID_CREDENTIALS_BODY)
                    .doesNotContain(SECRET_SENTINEL);
            assertThat(runtimeFailure.getContentAsString()).doesNotContain(SECRET_SENTINEL);
            assertThat(renderedLogEvents(appender.list)).doesNotContain(SECRET_SENTINEL);
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(previousLevel);
            appender.stop();
        }
    }

    @Test
    void successfulRequestExposesSubjectToChainAndClearsItAfterward() throws Exception {
        SubjectSum subject = mock(SubjectSum.class);
        when(securityManager.checkIn(any())).thenReturn(subject);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(new MockHttpServletRequest(), response,
                (request, servletResponse) -> assertThat(SurenessContextHolder.getBindSubject()).isSameAs(subject));

        assertThat(SurenessContextHolder.getBindSubject()).isNull();
    }

    @Test
    void websocketUpgradeRetainsSubjectContext() throws Exception {
        SubjectSum subject = mock(SubjectSum.class);
        when(securityManager.checkIn(any())).thenReturn(subject);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(new MockHttpServletRequest(), response, (request, servletResponse) -> {
            MockHttpServletResponse httpResponse = (MockHttpServletResponse) servletResponse;
            httpResponse.setStatus(HttpStatus.SWITCHING_PROTOCOLS.value());
            httpResponse.setHeader(HttpHeaders.UPGRADE, "websocket");
        });

        assertThat(SurenessContextHolder.getBindSubject()).isSameAs(subject);
    }

    private void assertErrorResponse(RuntimeException exception, HttpStatus status, String expectedBody) {
        assertThatNoException().isThrownBy(() -> {
            when(securityManager.checkIn(any())).thenThrow(exception);
            MockHttpServletResponse response = new MockHttpServletResponse();
            FilterChain chain = mock(FilterChain.class);

            filter.doFilter(new MockHttpServletRequest(), response, chain);

            assertThat(response.getStatus()).isEqualTo(status.value());
            assertThat(response.getContentAsString()).isEqualTo(expectedBody);
            verifyNoInteractions(chain);
        });
    }

    private MockHttpServletResponse filterOnce() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest(), response, mock(FilterChain.class));
        return response;
    }

    private static String renderedLogEvents(List<ILoggingEvent> events) {
        return events.stream()
                .map(event -> event.getFormattedMessage() + " "
                        + (event.getThrowableProxy() == null ? "" : event.getThrowableProxy().getMessage()))
                .reduce("", (left, right) -> left + "\n" + right);
    }
}
