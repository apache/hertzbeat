/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.startup;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigResponse;
import org.apache.hertzbeat.manager.pojo.dto.MessageServerConfigResult;
import org.apache.hertzbeat.manager.service.MessageServerConfigConflictException;
import org.apache.hertzbeat.manager.service.MessageServerConfigRevisionRequiredException;
import org.apache.hertzbeat.manager.service.MessageServerConfigService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

/** H2 proof for first-create exclusion and stale message-server writes. */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@SpringBootTest(classes = HertzBeatApplication.class, webEnvironment = SpringBootTest.WebEnvironment.NONE)
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.datasource.url=jdbc:h2:mem:message-server-concurrency;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.flyway.enabled=false",
    "warehouse.store.duckdb.enabled=false"
})
class MessageServerConfigConcurrencyIntegrationTest {

    @Autowired
    private MessageServerConfigService service;

    @Autowired
    private GeneralConfigDao generalConfigDao;

    @Test
    void concurrentCreateAndStaleUpdateNeverOverwriteTheWinner() throws Exception {
        generalConfigDao.deleteById("email");
        assertEquals("missing", service.getEmailConfig().revision());
        assertThrows(MessageServerConfigRevisionRequiredException.class,
                () -> service.saveEmailConfig(emailRequest(null, "old-client.example.test", null)));

        CountDownLatch start = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            List<Future<MessageServerConfigResult<EmailServerConfigResponse>>> attempts = List.of(
                    executor.submit(() -> createAfter(start, "first.example.test", "first-secret")),
                    executor.submit(() -> createAfter(start, "second.example.test", "second-secret")));
            start.countDown();

            int successes = 0;
            int conflicts = 0;
            for (Future<MessageServerConfigResult<EmailServerConfigResponse>> attempt : attempts) {
                try {
                    attempt.get();
                    successes++;
                } catch (ExecutionException exception) {
                    assertTrue(exception.getCause() instanceof MessageServerConfigConflictException);
                    assertEquals(MessageServerConfigConflictException.ERROR_CODE, exception.getCause().getMessage());
                    conflicts++;
                }
            }
            assertEquals(1, successes);
            assertEquals(1, conflicts);
        }

        MessageServerConfigResult<EmailServerConfigResponse> created = service.getEmailConfig();
        String firstRevision = created.revision();
        LocalDateTime firstUpdateTime = generalConfigDao.findByType("email").getGmtUpdate();
        assertTrue(created.config().configuredSecrets().contains("emailPassword"));

        MessageServerConfigResult<EmailServerConfigResponse> updated = service.saveEmailConfig(
                emailRequest(firstRevision, "winner-update.example.test", null));
        assertNotEquals(firstRevision, updated.revision());
        assertTrue(updated.config().configuredSecrets().contains("emailPassword"));
        assertTrue(generalConfigDao.findByType("email").getGmtUpdate().isAfter(firstUpdateTime));

        MessageServerConfigConflictException conflict = assertThrows(
                MessageServerConfigConflictException.class,
                () -> service.saveEmailConfig(emailRequest(firstRevision, "stale.example.test", "stale-secret")));
        assertEquals(MessageServerConfigConflictException.ERROR_CODE, conflict.getMessage());
        assertEquals("winner-update.example.test", service.getEmailConfig().config().emailHost());
        assertEquals(updated.revision(), service.getEmailConfig().revision());
    }

    private MessageServerConfigResult<EmailServerConfigResponse> createAfter(
            CountDownLatch start, String host, String password) throws InterruptedException {
        start.await();
        return service.saveEmailConfig(emailRequest("missing", host, password));
    }

    private EmailServerConfigRequest emailRequest(String revision, String host, String password) {
        EmailServerConfigRequest request = new EmailServerConfigRequest();
        request.setExpectedRevision(revision);
        request.setType(0);
        request.setEmailHost(host);
        request.setEmailUsername("ops@example.test");
        request.setEmailPassword(password);
        request.setEmailPort(465);
        request.setEmailSsl(true);
        request.setEmailStarttls(false);
        request.setEnable(false);
        return request;
    }
}
