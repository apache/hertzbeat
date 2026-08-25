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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Canonical entity-bound monitor metric target contracts. */
@ExtendWith(MockitoExtension.class)
class EntityMonitorMetricTargetCanonicalizerTest {

    @Mock
    private EntityMonitorBindQueryService bindQueryService;
    @Mock
    private EntityWorkspaceQueryService entityQueryService;
    @Mock
    private EntityIdentityQueryService identityQueryService;
    @Mock
    private MonitorService monitorService;
    @Mock
    private AppService appService;

    private EntityMonitorMetricTargetCanonicalizer canonicalizer;

    @BeforeEach
    void setUp() {
        canonicalizer = new EntityMonitorMetricTargetCanonicalizer(
                bindQueryService, entityQueryService, identityQueryService, monitorService, appService);
    }

    @Test
    void validIntentShouldProduceStableEntityServiceMetricAuthority() {
        arrangeValidStaticCatalog();

        var result = canonicalizer.canonicalize("workspace-a", intent());

        assertEquals("entity-monitor-metric.v1", result.version());
        assertEquals(7L, result.entityId());
        assertEquals("checkout", result.service().name());
        assertEquals("commerce", result.service().namespace());
        assertEquals("prod", result.service().environment());
        assertEquals("basic.qps", result.signal().query());
        assertEquals(11L, result.authority().bindingId());
        assertEquals("2026-08-15T00:00", result.authority().version());
        assertEquals(71, result.authority().hash().length());
    }

    @Test
    void queryRoutingChangesShouldChangeTheAuthorityHash() {
        arrangeValidStaticCatalog();
        String original = canonicalizer.canonicalize("workspace-a", intent()).authority().hash();
        when(monitorService.getMonitor(42L)).thenReturn(Monitor.builder().id(42L)
                .type(CommonConstants.MONITOR_TYPE_NORMAL).app("mysql").scrape("static")
                .name("mysql-local").instance("127.0.0.2:3306").build());
        String changedInstance = canonicalizer.canonicalize("workspace-a", intent()).authority().hash();
        when(monitorService.getMonitor(42L)).thenReturn(Monitor.builder().id(42L)
                .type(CommonConstants.MONITOR_TYPE_NORMAL).app("mysql").scrape("static")
                .name("mysql-renamed").instance("127.0.0.1:3306").build());

        String changedName = canonicalizer.canonicalize("workspace-a", intent()).authority().hash();

        assertNotEquals(original, changedInstance);
        assertNotEquals(original, changedName);
    }

    @Test
    void verifierRejectsDeletedBindingBeforeCatalogRead() {
        arrangeValidStaticCatalog();
        var expected = canonicalizer.canonicalize("workspace-a", intent());
        EntityMonitorMetricTargetVerifier verifier = new EntityMonitorMetricTargetVerifier(canonicalizer);

        assertTrue(verifier.verify("workspace-a", expected));
        when(bindQueryService.findMonitorBindsByMonitorId(42L)).thenReturn(List.of());

        assertFalse(verifier.verify("workspace-a", expected));
        verify(appService, times(2)).getAppDefine("mysql");
    }

    @Test
    void catalogSourceShouldFollowStaticPushAndDynamicMonitorSemantics() {
        arrangeValidStaticCatalog();
        canonicalizer.canonicalize("workspace-a", intent());
        verify(appService).getAppDefine("mysql");

        Monitor push = monitor(CommonConstants.MONITOR_TYPE_PUSH_AUTO_CREATE, "push", "static");
        when(monitorService.getMonitor(42L)).thenReturn(push);
        when(appService.getPushDefine(42L)).thenReturn(catalog());
        canonicalizer.canonicalize("workspace-a", intent());
        verify(appService).getPushDefine(42L);

        Monitor dynamic = monitor(CommonConstants.MONITOR_TYPE_NORMAL, "prometheus", "static");
        when(monitorService.getMonitor(42L)).thenReturn(dynamic);
        when(appService.getAutoGenerateDynamicDefine(42L)).thenReturn(catalog());
        canonicalizer.canonicalize("workspace-a", intent());
        verify(appService).getAutoGenerateDynamicDefine(42L);

        Monitor serviceDiscovery = monitor(CommonConstants.MONITOR_TYPE_NORMAL, "mysql", "http_sd");
        when(monitorService.getMonitor(42L)).thenReturn(serviceDiscovery);
        when(appService.getAppDefine("http_sd")).thenReturn(catalog());
        canonicalizer.canonicalize("workspace-a", intent());
        verify(appService).getAppDefine("http_sd");
    }

    @Test
    void missingMultipleInactiveOrForeignBindingsShouldFailClosed() {
        when(bindQueryService.findMonitorBindsByMonitorId(42L)).thenReturn(List.of());
        assertMismatch();
        when(bindQueryService.findMonitorBindsByMonitorId(42L)).thenReturn(List.of(binding(), binding()));
        assertMismatch();
        EntityMonitorBind inactive = binding();
        inactive.setStatus("inactive");
        when(bindQueryService.findMonitorBindsByMonitorId(42L)).thenReturn(List.of(inactive));
        assertMismatch();

        when(bindQueryService.findMonitorBindsByMonitorId(42L)).thenReturn(List.of(binding()));
        ObserveEntity foreign = entity();
        foreign.setWorkspaceId("workspace-b");
        when(entityQueryService.findEntityById(7L)).thenReturn(Optional.of(foreign));
        assertMismatch();
        verify(monitorService, never()).getMonitor(42L);
    }

    @Test
    void missingStringLabelOrHiddenMetricShouldFailClosed() {
        arrangeValidStaticCatalog();
        when(appService.getAppDefine("mysql")).thenReturn(job(metrics("other", true, numeric("qps"))));
        assertMismatch();
        when(appService.getAppDefine("mysql")).thenReturn(job(metrics("basic", true, string("qps"))));
        assertMismatch();
        when(appService.getAppDefine("mysql")).thenReturn(job(metrics("basic", true, label("qps"))));
        assertMismatch();
        when(appService.getAppDefine("mysql")).thenReturn(job(metrics("basic", false, numeric("qps"))));
        assertMismatch();
    }

    @Test
    void unreadableCatalogShouldReturnStableUnavailableWithoutCause() {
        arrangeAuthority();
        when(appService.getAppDefine("mysql")).thenThrow(new IllegalStateException("warehouse password leaked"));

        var failure = assertThrows(EntityMonitorMetricTargetCanonicalizer.CanonicalizationException.class,
                () -> canonicalizer.canonicalize("workspace-a", intent()));

        assertEquals(EntityMonitorMetricTargetCanonicalizer.FailureKind.UNAVAILABLE, failure.kind());
        assertEquals("Entity monitor metric target is unavailable", failure.getMessage());
        assertEquals(null, failure.getCause());
    }

    @Test
    void invalidMetricWindowOrTimezoneShouldFailBeforeAnyAuthorityRead() {
        List<EntityMonitorMetricTargetCanonicalizer.SourceIntent> invalid = List.of(
                new EntityMonitorMetricTargetCanonicalizer.SourceIntent(42L, "metrics", "basic", 1L, 2L, "UTC"),
                new EntityMonitorMetricTargetCanonicalizer.SourceIntent(42L, "metrics", "basic.qps", 2L, 1L, "UTC"),
                new EntityMonitorMetricTargetCanonicalizer.SourceIntent(42L, "metrics", "basic.qps", 1L, 2L,
                        "Mars/Olympus"),
                new EntityMonitorMetricTargetCanonicalizer.SourceIntent(42L, "metrics", "basic.qps", 1L,
                        1L + 12L * 7 * 24 * 60 * 60 * 1_000 + 1, "UTC"));

        for (var candidate : invalid) {
            assertThrows(EntityMonitorMetricTargetCanonicalizer.CanonicalizationException.class,
                    () -> canonicalizer.canonicalize("workspace-a", candidate));
        }
        verify(bindQueryService, never()).findMonitorBindsByMonitorId(42L);
    }

    private void assertMismatch() {
        var failure = assertThrows(EntityMonitorMetricTargetCanonicalizer.CanonicalizationException.class,
                () -> canonicalizer.canonicalize("workspace-a", intent()));
        assertEquals(EntityMonitorMetricTargetCanonicalizer.FailureKind.MISMATCH, failure.kind());
        assertEquals("Entity monitor metric target does not match", failure.getMessage());
        assertEquals(null, failure.getCause());
    }

    private void arrangeValidStaticCatalog() {
        arrangeAuthority();
        when(appService.getAppDefine("mysql")).thenReturn(catalog());
    }

    private void arrangeAuthority() {
        when(bindQueryService.findMonitorBindsByMonitorId(42L)).thenReturn(List.of(binding()));
        when(entityQueryService.findEntityById(7L)).thenReturn(Optional.of(entity()));
        when(identityQueryService.findIdentities(7L)).thenReturn(identities());
        when(monitorService.getMonitor(42L)).thenReturn(monitor(CommonConstants.MONITOR_TYPE_NORMAL,
                "mysql", "static"));
    }

    private EntityMonitorMetricTargetCanonicalizer.SourceIntent intent() {
        return new EntityMonitorMetricTargetCanonicalizer.SourceIntent(
                42L, "metrics", "basic.qps", 1000L, 2000L, "UTC");
    }

    private EntityMonitorBind binding() {
        return EntityMonitorBind.builder().id(11L).entityId(7L).monitorId(42L).status("active")
                .bindType("manual").bindSource("service.name").score(100)
                .gmtUpdate(LocalDateTime.parse("2026-08-15T00:00:00")).build();
    }

    private ObserveEntity entity() {
        return ObserveEntity.builder().id(7L).workspaceId("workspace-a").type("service")
                .name("checkout").status("healthy").source("manual").build();
    }

    private List<EntityIdentity> identities() {
        return List.of(identity(1L, "service.name", "checkout"),
                identity(2L, "service.namespace", "commerce"),
                identity(3L, "deployment.environment.name", "prod"));
    }

    private EntityIdentity identity(long id, String key, String value) {
        return EntityIdentity.builder().id(id).entityId(7L).identityType("derived").identityKey(key)
                .identityValue(value).normalizedValue(value).priority(10).primaryIdentity(id == 1L).build();
    }

    private Monitor monitor(byte type, String app, String scrape) {
        return Monitor.builder().id(42L).type(type).app(app).scrape(scrape).name("mysql-local")
                .instance("127.0.0.1:3306").build();
    }

    private Job catalog() {
        return job(metrics("basic", true, numeric("qps")));
    }

    private Job job(Metrics metrics) {
        return Job.builder().metrics(List.of(metrics)).build();
    }

    private Metrics metrics(String name, boolean visible, Metrics.Field field) {
        return Metrics.builder().name(name).visible(visible).fields(List.of(field)).build();
    }

    private Metrics.Field numeric(String field) {
        return Metrics.Field.builder().field(field).type(CommonConstants.TYPE_NUMBER).build();
    }

    private Metrics.Field string(String field) {
        return Metrics.Field.builder().field(field).type(CommonConstants.TYPE_STRING).build();
    }

    private Metrics.Field label(String field) {
        return Metrics.Field.builder().field(field).type(CommonConstants.TYPE_NUMBER).label(true).build();
    }
}
