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

package org.apache.hertzbeat.manager.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Collections;
import java.util.List;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.alert.dao.AlertInhibitDao;
import org.apache.hertzbeat.alert.dao.AlertSilenceDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogContact;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogLink;
import org.apache.hertzbeat.common.entity.manager.EntityDefinitionActivity;
import org.apache.hertzbeat.common.entity.manager.EntityGovernanceState;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.EntityOwnerRef;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.EntityIdentityDao;
import org.apache.hertzbeat.manager.dao.EntityMonitorBindDao;
import org.apache.hertzbeat.manager.dao.EntityRelationDao;
import org.apache.hertzbeat.manager.dao.EntityDefinitionActivityDao;
import org.apache.hertzbeat.manager.dao.EntityGovernanceStateDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ObserveEntityDao;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernancePresetInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceResumeInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceTemplateInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityCatalogSuggestionsInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.apache.hertzbeat.manager.pojo.dto.EntitySummaryInfo;
import org.apache.hertzbeat.common.observability.gateway.EntityObservabilityGateway;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.observability.shared.service.impl.EntityObservabilityGatewayImpl;
import org.apache.hertzbeat.observability.shared.service.impl.TelemetryIntakeServiceImpl;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.manager.service.impl.ObserveEntityServiceImpl;
import org.apache.hertzbeat.manager.service.entity.EntityActivityQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityActivityReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityActivityRecordWriteModelService;
import org.apache.hertzbeat.manager.service.entity.EntityActivityWriteModelService;
import org.apache.hertzbeat.manager.service.entity.EntityAlertEvidenceQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityAlertEvidenceReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityCatalogQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityCatalogProfileService;
import org.apache.hertzbeat.manager.service.entity.EntityCoreWriteModelService;
import org.apache.hertzbeat.manager.service.entity.EntityDeletionWriteModelService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionDocumentFieldNormalizationService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionDocumentParserService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionDocumentRendererService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionDraftService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionExportService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionExtensionNormalizationService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionHertzbeatNormalizationService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionMetadataNormalizationService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionMappingService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionNormalizationService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionRelationNormalizationService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionSpecNormalizationService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionTelemetryNormalizationService;
import org.apache.hertzbeat.manager.service.entity.EntityDefinitionTypeResolverService;
import org.apache.hertzbeat.manager.service.entity.EntityDetailObservabilityReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityDetailReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityEvidenceReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityGovernanceStateQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityGovernanceStateService;
import org.apache.hertzbeat.manager.service.entity.EntityGovernanceStateWriteModelService;
import org.apache.hertzbeat.manager.service.entity.EntityGovernanceWorkflowService;
import org.apache.hertzbeat.manager.service.entity.EntityIdentityQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityIdentityReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityIdentityResolutionService;
import org.apache.hertzbeat.manager.service.entity.EntityIdentityWriteModelService;
import org.apache.hertzbeat.manager.service.entity.EntityIntegrationHintService;
import org.apache.hertzbeat.manager.service.entity.EntityListReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorBindQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorBindService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorBindWriteModelService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorEvidenceReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityMutationWorkflowService;
import org.apache.hertzbeat.manager.service.entity.EntityNoiseControlReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityNoiseControlRuleQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityRelationQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityRelationService;
import org.apache.hertzbeat.manager.service.entity.EntityRelationWriteModelService;
import org.apache.hertzbeat.manager.service.entity.EntityResponseHandoffReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityRuntimeHealthService;
import org.apache.hertzbeat.manager.service.entity.EntityRuntimeHealthWriteModelService;
import org.apache.hertzbeat.manager.service.entity.EntityStatusRefreshService;
import org.apache.hertzbeat.manager.service.entity.EntitySummaryReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityValidationService;
import org.apache.hertzbeat.manager.service.entity.EntityWorkspaceAccessService;
import org.apache.hertzbeat.manager.service.entity.EntityWorkspaceQueryService;
import org.apache.hertzbeat.warehouse.repository.LogQueryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Test case for {@link ObserveEntityService}.
 */
@ExtendWith(MockitoExtension.class)
class ObserveEntityServiceTest {

    @InjectMocks
    private ObserveEntityServiceImpl observeEntityService;

    @Mock
    private ObserveEntityDao observeEntityDao;

    @Mock
    private EntityDefinitionActivityDao entityDefinitionActivityDao;
    @Mock
    private EntityGovernanceStateDao entityGovernanceStateDao;

    @Mock
    private EntityIdentityDao entityIdentityDao;

    @Mock
    private EntityMonitorBindDao entityMonitorBindDao;

    @Mock
    private EntityRelationDao entityRelationDao;

    @Mock
    private MonitorDao monitorDao;

    @Mock
    private SingleAlertDao singleAlertDao;

    @Mock
    private AlertSilenceDao alertSilenceDao;

    @Mock
    private AlertInhibitDao alertInhibitDao;

    @Mock
    private EntityTraceQueryService entityTraceQueryService;

    @Mock
    private LogQueryRepository logQueryRepository;

    private TelemetryIntakeServiceImpl telemetryIntakeService;
    private EntityObservabilityGateway entityObservabilityGateway;
    private EntityActivityQueryService entityActivityQueryService;
    private EntityActivityReadModelService entityActivityReadModelService;
    private EntityActivityRecordWriteModelService entityActivityRecordWriteModelService;
    private EntityActivityWriteModelService entityActivityWriteModelService;
    private EntityAlertEvidenceQueryService entityAlertEvidenceQueryService;
    private EntityAlertEvidenceReadModelService entityAlertEvidenceReadModelService;
    private EntityCatalogQueryService entityCatalogQueryService;
    private EntityCatalogProfileService entityCatalogProfileService;
    private EntityCoreWriteModelService entityCoreWriteModelService;
    private EntityDeletionWriteModelService entityDeletionWriteModelService;
    private EntityDefinitionDocumentParserService entityDefinitionDocumentParserService;
    private EntityDefinitionDocumentRendererService entityDefinitionDocumentRendererService;
    private EntityDefinitionDraftService entityDefinitionDraftService;
    private EntityDefinitionExportService entityDefinitionExportService;
    private EntityDefinitionMappingService entityDefinitionMappingService;
    private EntityDefinitionNormalizationService entityDefinitionNormalizationService;
    private EntityDetailObservabilityReadModelService entityDetailObservabilityReadModelService;
    private EntityDetailReadModelService entityDetailReadModelService;
    private EntityEvidenceReadModelService entityEvidenceReadModelService;
    private EntityGovernanceStateQueryService entityGovernanceStateQueryService;
    private EntityGovernanceStateWriteModelService entityGovernanceStateWriteModelService;
    private EntityGovernanceStateService entityGovernanceStateService;
    private EntityGovernanceWorkflowService entityGovernanceWorkflowService;
    private EntityIdentityQueryService entityIdentityQueryService;
    private EntityIdentityReadModelService entityIdentityReadModelService;
    private EntityIdentityResolutionService entityIdentityResolutionService;
    private EntityIdentityWriteModelService entityIdentityWriteModelService;
    private EntityIntegrationHintService entityIntegrationHintService;
    private EntityListReadModelService entityListReadModelService;
    private EntityMonitorBindQueryService entityMonitorBindQueryService;
    private EntityMonitorBindService entityMonitorBindService;
    private EntityMonitorBindWriteModelService entityMonitorBindWriteModelService;
    private EntityMonitorEvidenceReadModelService entityMonitorEvidenceReadModelService;
    private EntityMonitorQueryService entityMonitorQueryService;
    private EntityMutationWorkflowService entityMutationWorkflowService;
    private EntityNoiseControlRuleQueryService entityNoiseControlRuleQueryService;
    private EntityNoiseControlReadModelService entityNoiseControlReadModelService;
    private EntityRelationQueryService entityRelationQueryService;
    private EntityRelationService entityRelationService;
    private EntityRelationWriteModelService entityRelationWriteModelService;
    private EntityResponseHandoffReadModelService entityResponseHandoffReadModelService;
    private EntityRuntimeHealthService entityRuntimeHealthService;
    private EntityStatusRefreshService entityStatusRefreshService;
    private EntitySummaryReadModelService entitySummaryReadModelService;
    private EntityValidationService entityValidationService;
    private EntityWorkspaceAccessService entityWorkspaceAccessService;
    private EntityWorkspaceQueryService entityWorkspaceQueryService;
    private Locale previousLocale;

    @BeforeEach
    void setUpNoiseControlDefaults() {
        previousLocale = Locale.getDefault();
        Locale.setDefault(Locale.US);
        telemetryIntakeService = org.mockito.Mockito.spy(new TelemetryIntakeServiceImpl(logQueryRepository));
        entityObservabilityGateway = org.mockito.Mockito.spy(
                new EntityObservabilityGatewayImpl(telemetryIntakeService, entityTraceQueryService));
        entityWorkspaceQueryService = new EntityWorkspaceQueryService(observeEntityDao);
        entityWorkspaceAccessService = new EntityWorkspaceAccessService(entityWorkspaceQueryService);
        entityActivityQueryService = new EntityActivityQueryService(
                entityDefinitionActivityDao, entityWorkspaceAccessService);
        entityActivityReadModelService = new EntityActivityReadModelService(entityActivityQueryService);
        ReflectionTestUtils.setField(
                observeEntityService, "entityActivityReadModelService", entityActivityReadModelService);
        entityAlertEvidenceQueryService = new EntityAlertEvidenceQueryService(
                singleAlertDao, entityWorkspaceAccessService);
        entityAlertEvidenceReadModelService = new EntityAlertEvidenceReadModelService(entityAlertEvidenceQueryService);
        entityCatalogQueryService = new EntityCatalogQueryService(
                entityWorkspaceQueryService, entityWorkspaceAccessService);
        entityCatalogProfileService = new EntityCatalogProfileService(entityWorkspaceAccessService);
        ReflectionTestUtils.setField(
                observeEntityService, "entityCatalogProfileService", entityCatalogProfileService);
        entityDefinitionDocumentParserService = new EntityDefinitionDocumentParserService();
        entityDefinitionDocumentRendererService = new EntityDefinitionDocumentRendererService();
        entityCoreWriteModelService = new EntityCoreWriteModelService(entityWorkspaceAccessService, observeEntityDao);
        entityMonitorQueryService = new EntityMonitorQueryService(monitorDao);
        entityMonitorBindQueryService = new EntityMonitorBindQueryService(entityMonitorBindDao);
        entityMonitorBindWriteModelService = new EntityMonitorBindWriteModelService(entityMonitorBindDao);
        entityMonitorBindService = new EntityMonitorBindService(
                entityMonitorBindQueryService, entityMonitorQueryService, entityMonitorBindWriteModelService);
        entityActivityRecordWriteModelService = new EntityActivityRecordWriteModelService(
                entityDefinitionActivityDao, entityWorkspaceAccessService);
        entityActivityWriteModelService = new EntityActivityWriteModelService(
                entityActivityRecordWriteModelService, entityMonitorBindService);
        entityRelationQueryService = new EntityRelationQueryService(entityRelationDao);
        entityRelationWriteModelService = new EntityRelationWriteModelService(entityRelationDao);
        entityRelationService = new EntityRelationService(
                entityWorkspaceAccessService, entityRelationQueryService, entityRelationWriteModelService);
        entityIdentityQueryService = new EntityIdentityQueryService(entityIdentityDao);
        entityIdentityReadModelService = new EntityIdentityReadModelService(entityIdentityQueryService);
        entityDetailReadModelService = new EntityDetailReadModelService(
                entityIdentityReadModelService, entityMonitorBindService, entityRelationService,
                entityWorkspaceAccessService);
        ReflectionTestUtils.setField(observeEntityService, "entityDetailReadModelService", entityDetailReadModelService);
        entityGovernanceStateQueryService = new EntityGovernanceStateQueryService(
                entityGovernanceStateDao, entityWorkspaceAccessService);
        entityGovernanceStateWriteModelService = new EntityGovernanceStateWriteModelService(
                entityGovernanceStateDao, entityWorkspaceAccessService);
        entityGovernanceStateService = new EntityGovernanceStateService(
                entityGovernanceStateQueryService, entityGovernanceStateWriteModelService);
        entityGovernanceWorkflowService = new EntityGovernanceWorkflowService(entityGovernanceStateService);
        ReflectionTestUtils.setField(
                observeEntityService, "entityGovernanceWorkflowService", entityGovernanceWorkflowService);
        entityIdentityResolutionService = new EntityIdentityResolutionService(
                entityIdentityReadModelService, entityMonitorBindService, entityWorkspaceAccessService);
        entityIdentityWriteModelService = new EntityIdentityWriteModelService(
                entityIdentityDao, entityIdentityResolutionService);
        entityIntegrationHintService = new EntityIntegrationHintService(
                entityMonitorQueryService, entityIdentityResolutionService);
        ReflectionTestUtils.setField(
                observeEntityService, "entityIntegrationHintService", entityIntegrationHintService);
        entityDeletionWriteModelService = new EntityDeletionWriteModelService(
                entityWorkspaceAccessService,
                entityIdentityWriteModelService,
                entityMonitorBindService,
                entityRelationService,
                entityCoreWriteModelService);
        ReflectionTestUtils.setField(
                observeEntityService, "entityDeletionWriteModelService", entityDeletionWriteModelService);
        entityMonitorEvidenceReadModelService = new EntityMonitorEvidenceReadModelService();
        entityEvidenceReadModelService = new EntityEvidenceReadModelService(
                entityWorkspaceAccessService,
                entityMonitorBindService,
                entityAlertEvidenceReadModelService,
                entityMonitorEvidenceReadModelService);
        ReflectionTestUtils.setField(observeEntityService, "entityEvidenceReadModelService", entityEvidenceReadModelService);
        entityNoiseControlRuleQueryService = new EntityNoiseControlRuleQueryService(alertSilenceDao, alertInhibitDao);
        entityNoiseControlReadModelService = new EntityNoiseControlReadModelService(
                entityNoiseControlRuleQueryService, entityWorkspaceAccessService);
        entityDefinitionMappingService = new EntityDefinitionMappingService(
                entityRelationService, entityWorkspaceAccessService);
        entityDefinitionExportService = new EntityDefinitionExportService(
                entityDetailReadModelService,
                entityDefinitionMappingService,
                entityDefinitionDocumentRendererService);
        ReflectionTestUtils.setField(
                observeEntityService, "entityDefinitionExportService", entityDefinitionExportService);
        entityDefinitionNormalizationService = new EntityDefinitionNormalizationService(
                new EntityDefinitionDocumentFieldNormalizationService(),
                new EntityDefinitionMetadataNormalizationService(),
                new EntityDefinitionSpecNormalizationService(),
                new EntityDefinitionExtensionNormalizationService(),
                new EntityDefinitionTypeResolverService(),
                new EntityDefinitionTelemetryNormalizationService(),
                new EntityDefinitionRelationNormalizationService(entityRelationService),
                new EntityDefinitionHertzbeatNormalizationService());
        entityDefinitionDraftService = new EntityDefinitionDraftService(
                entityDefinitionDocumentParserService,
                entityDefinitionNormalizationService,
                entityDefinitionMappingService);
        ReflectionTestUtils.setField(
                observeEntityService, "entityDefinitionDraftService", entityDefinitionDraftService);
        entityResponseHandoffReadModelService = new EntityResponseHandoffReadModelService(entityObservabilityGateway);
        EntityRuntimeHealthWriteModelService entityRuntimeHealthWriteModelService =
                new EntityRuntimeHealthWriteModelService(entityCoreWriteModelService);
        entityRuntimeHealthService = new EntityRuntimeHealthService(entityRuntimeHealthWriteModelService);
        entityStatusRefreshService = new EntityStatusRefreshService(
                entityMonitorBindService, entityAlertEvidenceReadModelService,
                entityRuntimeHealthService);
        entityValidationService = new EntityValidationService();
        ReflectionTestUtils.setField(observeEntityService, "entityValidationService", entityValidationService);
        entityMutationWorkflowService = new EntityMutationWorkflowService(
                entityCoreWriteModelService,
                entityIdentityWriteModelService,
                entityMonitorBindService,
                entityRelationService,
                entityStatusRefreshService,
                entityActivityWriteModelService,
                entityDefinitionDraftService,
                entityValidationService,
                entityWorkspaceAccessService);
        ReflectionTestUtils.setField(observeEntityService, "entityMutationWorkflowService", entityMutationWorkflowService);
        entityDetailObservabilityReadModelService = new EntityDetailObservabilityReadModelService(
                entityDetailReadModelService,
                entityStatusRefreshService,
                entityObservabilityGateway,
                entityResponseHandoffReadModelService,
                entityNoiseControlReadModelService,
                entityActivityReadModelService,
                entityWorkspaceAccessService);
        ReflectionTestUtils.setField(
                observeEntityService, "entityDetailObservabilityReadModelService", entityDetailObservabilityReadModelService);
        entitySummaryReadModelService = new EntitySummaryReadModelService(
                entityActivityReadModelService,
                entityIdentityReadModelService,
                entityMonitorBindService,
                entityRelationService,
                entityObservabilityGateway);
        entityListReadModelService = new EntityListReadModelService(
                entityCatalogQueryService,
                entityStatusRefreshService,
                entitySummaryReadModelService);
        ReflectionTestUtils.setField(observeEntityService, "entityListReadModelService", entityListReadModelService);
        lenient().when(alertSilenceDao.findAll()).thenReturn(Collections.emptyList());
        lenient().when(alertInhibitDao.findAll()).thenReturn(Collections.emptyList());
        lenient().when(entityTraceQueryService.buildEntityTraceSummary(any()))
                .thenReturn(new EntityTraceSummaryDto(0, 0, null, false, null));
        lenient().when(entityTraceQueryService.buildEntityTraceQueryHints(any()))
                .thenReturn(Collections.emptyList());
    }

    @AfterEach
    void tearDownRequestContext() {
        AuthTokenRequestContext.clear();
        Locale.setDefault(previousLocale);
    }

    @Test
    void validateRejectUnsupportedType() {
        EntityInfo entityInfo = new EntityInfo();
        entityInfo.setType("custom_asset");
        entityInfo.setName("payment");
        EntityDto entityDto = new EntityDto();
        entityDto.setEntityInfo(entityInfo);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> observeEntityService.validate(entityDto, false));

        assertEquals("Unsupported entity type.", exception.getMessage());
    }

    @Test
    void getMonitorBindingCandidatesUseOtelIdentityPriority() {
        Monitor monitor = new Monitor();
        monitor.setId(101L);
        monitor.setApp("springboot3");
        monitor.setName("payment-service");
        monitor.setLabels(Map.of(
                "service.name", "payment-service",
                "service.namespace", "prod"
        ));
        when(monitorDao.findById(101L)).thenReturn(Optional.of(monitor));

        EntityIdentity serviceNameIdentity = EntityIdentity.builder()
                .entityId(1L)
                .identityKey("service.name")
                .identityValue("payment-service")
                .normalizedValue("payment-service")
                .priority(90)
                .primaryIdentity(true)
                .build();
        EntityIdentity namespaceIdentity = EntityIdentity.builder()
                .entityId(1L)
                .identityKey("service.namespace")
                .identityValue("prod")
                .normalizedValue("prod")
                .priority(30)
                .primaryIdentity(false)
                .build();
        when(entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(any(Set.class), any(Set.class)))
                .thenReturn(List.of(serviceNameIdentity, namespaceIdentity));
        when(entityMonitorBindDao.findAllByMonitorId(101L)).thenReturn(Collections.emptyList());

        ObserveEntity entity = ObserveEntity.builder()
                .id(1L)
                .type("service")
                .name("payment-service")
                .displayName("Payment Service")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findAllById(Set.of(1L))).thenReturn(List.of(entity));

        List<EntityMonitorBindingCandidate> candidates = observeEntityService.getMonitorBindingCandidates(101L);

        assertEquals(1, candidates.size());
        EntityMonitorBindingCandidate candidate = candidates.getFirst();
        assertEquals(1L, candidate.getEntityId());
        assertEquals("direct", candidate.getRecommendation());
        assertEquals(160, candidate.getScore());
        assertFalse(candidate.isAlreadyBound());
        assertTrue(candidate.getMatchedIdentities().containsKey("service.name"));
        assertTrue(candidate.getMatchedIdentities().containsKey("service.namespace"));
    }

    @Test
    void getMonitorBindingCandidatesSupportCanonicalContainerIdentity() {
        Monitor monitor = new Monitor();
        monitor.setId(102L);
        monitor.setApp("docker");
        monitor.setName("checkout-sidecar");
        monitor.setLabels(Map.of(
                "container.name", "checkout-sidecar",
                "cloud.region", "cn-shanghai"
        ));
        when(monitorDao.findById(102L)).thenReturn(Optional.of(monitor));

        EntityIdentity containerIdentity = EntityIdentity.builder()
                .entityId(2L)
                .identityKey("container.name")
                .identityValue("checkout-sidecar")
                .normalizedValue("checkout-sidecar")
                .priority(70)
                .primaryIdentity(true)
                .build();
        EntityIdentity regionIdentity = EntityIdentity.builder()
                .entityId(2L)
                .identityKey("cloud.region")
                .identityValue("cn-shanghai")
                .normalizedValue("cn-shanghai")
                .priority(10)
                .primaryIdentity(false)
                .build();
        when(entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(any(Set.class), any(Set.class)))
                .thenReturn(List.of(containerIdentity, regionIdentity));
        when(entityMonitorBindDao.findAllByMonitorId(102L)).thenReturn(Collections.emptyList());

        ObserveEntity entity = ObserveEntity.builder()
                .id(2L)
                .type("service")
                .name("checkout-sidecar")
                .displayName("Checkout Sidecar")
                .status("unknown")
                .source("otel_resource")
                .build();
        when(observeEntityDao.findAllById(Set.of(2L))).thenReturn(List.of(entity));

        List<EntityMonitorBindingCandidate> candidates = observeEntityService.getMonitorBindingCandidates(102L);

        assertEquals(1, candidates.size());
        assertTrue(candidates.getFirst().getMatchedIdentities().containsKey("container.name"));
        assertTrue(candidates.getFirst().getMatchedIdentities().containsKey("cloud.region"));
    }

    @Test
    void getMonitorBindingCandidatesFilterByRequestWorkspace() {
        Monitor monitor = new Monitor();
        monitor.setId(105L);
        monitor.setApp("springboot3");
        monitor.setName("checkout-api");
        monitor.setLabels(Map.of("service.name", "checkout-api"));
        when(monitorDao.findById(105L)).thenReturn(Optional.of(monitor));

        EntityIdentity teamAlphaIdentity = EntityIdentity.builder()
                .entityId(5L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .priority(90)
                .primaryIdentity(true)
                .build();
        EntityIdentity teamBetaIdentity = EntityIdentity.builder()
                .entityId(6L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .priority(90)
                .primaryIdentity(true)
                .build();
        when(entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(any(Set.class), any(Set.class)))
                .thenReturn(List.of(teamAlphaIdentity, teamBetaIdentity));
        when(entityMonitorBindDao.findAllByMonitorId(105L)).thenReturn(Collections.emptyList());

        ObserveEntity teamAlphaEntity = ObserveEntity.builder()
                .id(5L)
                .type("service")
                .name("checkout-api")
                .displayName("Checkout API")
                .status("unknown")
                .source("otel_resource")
                .workspaceId("team-a")
                .build();
        ObserveEntity teamBetaEntity = ObserveEntity.builder()
                .id(6L)
                .type("service")
                .name("checkout-api")
                .displayName("Checkout API Shadow")
                .status("unknown")
                .source("otel_resource")
                .workspaceId("team-b")
                .build();
        when(observeEntityDao.findAllById(Set.of(5L, 6L))).thenReturn(List.of(teamAlphaEntity, teamBetaEntity));

        AuthTokenRequestContext.bindWorkspaceId("team-a");

        List<EntityMonitorBindingCandidate> candidates = observeEntityService.getMonitorBindingCandidates(105L);

        assertEquals(1, candidates.size());
        assertEquals(5L, candidates.getFirst().getEntityId());
        assertEquals("Checkout API", candidates.getFirst().getEntityName());
    }

    @Test
    void governanceStateReadsUseRequestWorkspaceBoundary() {
        EntityGovernanceState template = EntityGovernanceState.builder()
                .stateScope("definition")
                .stateKind("template")
                .stateKey("team-a-template")
                .stateName("Team A template")
                .status("telemetry")
                .content(JsonUtil.fromJson("""
                        {
                          "format":"yaml",
                          "content":"kind: service",
                          "summary":"team-a",
                          "source":"telemetry",
                          "kind":"service"
                        }
                        """))
                .workspaceId("team-a")
                .gmtUpdate(LocalDateTime.of(2026, 5, 10, 9, 0))
                .build();
        EntityGovernanceState activity = EntityGovernanceState.builder()
                .stateScope("definition")
                .stateKind("activity")
                .stateKey("definition-activity-a")
                .stateName("Imported team-a")
                .status("success")
                .content(JsonUtil.fromJson("""
                        {
                          "format":"yaml",
                          "summary":"Imported team-a",
                          "detail":"1 entity",
                          "entityId":101,
                          "entityName":"checkout-api"
                        }
                        """))
                .workspaceId("team-a")
                .gmtUpdate(LocalDateTime.of(2026, 5, 10, 9, 1))
                .build();
        EntityGovernanceState resume = EntityGovernanceState.builder()
                .stateScope("definition")
                .stateKind("resume")
                .stateKey("resume-a")
                .stateName("telemetry")
                .status("yaml")
                .content(JsonUtil.fromJson("""
                        {
                          "content":"kind: service",
                          "format":"yaml",
                          "source":"telemetry",
                          "count":1,
                          "queryParams":{"format":"yaml"}
                        }
                        """))
                .workspaceId("team-a")
                .gmtUpdate(LocalDateTime.of(2026, 5, 10, 9, 2))
                .build();
        EntityGovernanceState preset = EntityGovernanceState.builder()
                .stateScope("discovery")
                .stateKind("preset")
                .stateKey("preset-a")
                .stateName("Team A governance")
                .status("healthy")
                .content(JsonUtil.fromJson("""
                        {
                          "owner":"catalog-oncall",
                          "system":"commerce",
                          "source":"telemetry",
                          "environment":"prod",
                          "status":"healthy"
                        }
                        """))
                .workspaceId("team-a")
                .gmtUpdate(LocalDateTime.of(2026, 5, 10, 9, 3))
                .build();
        EntityGovernanceState discoveryActivity = EntityGovernanceState.builder()
                .stateScope("discovery")
                .stateKind("activity")
                .stateKey("discovery-activity-a")
                .stateName("Bulk adopt team-a")
                .status("success")
                .content(JsonUtil.fromJson("""
                        {
                          "action":"bulk-adopt-definition",
                          "summary":"Adopted team-a",
                          "detail":"1 row seeded",
                          "workspacePath":"/entities/import?format=yaml&seedActivity=discovery-activity-a",
                          "seedDefinitionSource":"telemetry",
                          "seedDefinitionCount":1
                        }
                        """))
                .workspaceId("team-a")
                .gmtUpdate(LocalDateTime.of(2026, 5, 10, 9, 4))
                .build();
        when(entityGovernanceStateDao.findAllByStateScopeAndStateKindAndWorkspaceIdOrderByGmtUpdateDescIdDesc(
                "definition", "template", "team-a", PageRequest.of(0, 8))).thenReturn(List.of(template));
        when(entityGovernanceStateDao.findAllByStateScopeAndStateKindAndWorkspaceIdOrderByGmtUpdateDescIdDesc(
                "definition", "activity", "team-a", PageRequest.of(0, 8))).thenReturn(List.of(activity));
        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "definition", "resume", "resume-a", "team-a")).thenReturn(Optional.of(resume));
        when(entityGovernanceStateDao.findAllByStateScopeAndStateKindAndWorkspaceIdOrderByGmtUpdateDescIdDesc(
                "discovery", "preset", "team-a", PageRequest.of(0, 8))).thenReturn(List.of(preset));
        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "discovery", "activity", "discovery-activity-a", "team-a")).thenReturn(Optional.of(discoveryActivity));

        AuthTokenRequestContext.bindWorkspaceId("team-a");

        assertEquals("team-a-template", observeEntityService.getDefinitionWorkspaceTemplates(null, 8).getFirst().getId());
        assertEquals("definition-activity-a", observeEntityService.getDefinitionWorkspaceActivities(null, 8).getFirst().getId());
        assertEquals("resume-a", observeEntityService.getDefinitionWorkspaceResume("resume-a").getToken());
        assertEquals("preset-a", observeEntityService.getDiscoveryGovernancePresets(8).getFirst().getId());
        assertEquals("discovery-activity-a",
                observeEntityService.getDiscoveryGovernanceActivities("discovery-activity-a", 8).getFirst().getId());
    }

    @Test
    void governanceStateWritesUseRequestWorkspaceBoundary() {
        EntityDefinitionWorkspaceTemplateInfo templateInfo = new EntityDefinitionWorkspaceTemplateInfo();
        templateInfo.setId("team-template");
        templateInfo.setName("Team template");
        templateInfo.setFormat("yaml");
        templateInfo.setContent("kind: service");
        templateInfo.setSource("telemetry");
        templateInfo.setKind("service");
        EntityDefinitionWorkspaceActivityInfo activityInfo = new EntityDefinitionWorkspaceActivityInfo();
        activityInfo.setId("team-definition-activity");
        activityInfo.setStatus("success");
        activityInfo.setFormat("yaml");
        activityInfo.setSummary("Imported team definition");
        EntityDefinitionWorkspaceResumeInfo resumeInfo = new EntityDefinitionWorkspaceResumeInfo();
        resumeInfo.setToken("team-resume");
        resumeInfo.setContent("kind: service");
        resumeInfo.setFormat("yaml");
        resumeInfo.setSource("telemetry");
        EntityDiscoveryGovernancePresetInfo presetInfo = new EntityDiscoveryGovernancePresetInfo();
        presetInfo.setId("team-preset");
        presetInfo.setName("Team preset");
        presetInfo.setStatus("healthy");
        EntityDiscoveryGovernanceActivityInfo discoveryActivityInfo = new EntityDiscoveryGovernanceActivityInfo();
        discoveryActivityInfo.setId("team-discovery-activity");
        discoveryActivityInfo.setStatus("success");
        discoveryActivityInfo.setAction("bulk-adopt-definition");
        discoveryActivityInfo.setSummary("Adopted team definition");

        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "definition", "template", "team-template", "team-a")).thenReturn(Optional.empty());
        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "definition", "activity", "team-definition-activity", "team-a")).thenReturn(Optional.empty());
        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "definition", "resume", "team-resume", "team-a")).thenReturn(Optional.empty());
        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "discovery", "preset", "team-preset", "team-a")).thenReturn(Optional.empty());
        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "discovery", "activity", "team-discovery-activity", "team-a")).thenReturn(Optional.empty());
        when(entityGovernanceStateDao.saveAndFlush(any(EntityGovernanceState.class))).thenAnswer(invocation -> {
            EntityGovernanceState state = invocation.getArgument(0);
            state.setGmtUpdate(LocalDateTime.of(2026, 5, 10, 10, 0));
            return state;
        });

        AuthTokenRequestContext.bindWorkspaceId("team-a");

        observeEntityService.saveDefinitionWorkspaceTemplate(templateInfo);
        observeEntityService.saveDefinitionWorkspaceActivity(activityInfo);
        observeEntityService.saveDefinitionWorkspaceResume(resumeInfo);
        observeEntityService.saveDiscoveryGovernancePreset(presetInfo);
        observeEntityService.saveDiscoveryGovernanceActivity(discoveryActivityInfo);
        observeEntityService.deleteDefinitionWorkspaceTemplate("team-template");
        observeEntityService.deleteDefinitionWorkspaceResume("team-resume");
        observeEntityService.deleteDiscoveryGovernancePreset("team-preset");

        ArgumentCaptor<EntityGovernanceState> captor = ArgumentCaptor.forClass(EntityGovernanceState.class);
        verify(entityGovernanceStateDao, times(5)).saveAndFlush(captor.capture());
        assertTrue(captor.getAllValues().stream().allMatch(state -> "team-a".equals(state.getWorkspaceId())));
        verify(entityGovernanceStateDao).deleteByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "definition", "template", "team-template", "team-a");
        verify(entityGovernanceStateDao).deleteByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "definition", "resume", "team-resume", "team-a");
        verify(entityGovernanceStateDao).deleteByStateScopeAndStateKindAndStateKeyAndWorkspaceId(
                "discovery", "preset", "team-preset", "team-a");
        verify(entityGovernanceStateDao, times(0)).deleteByStateScopeAndStateKindAndStateKey(
                "definition", "template", "team-template");
        verify(entityGovernanceStateDao, times(0)).deleteByStateScopeAndStateKindAndStateKey(
                "definition", "resume", "team-resume");
        verify(entityGovernanceStateDao, times(0)).deleteByStateScopeAndStateKindAndStateKey(
                "discovery", "preset", "team-preset");
    }

    @Test
    void saveDiscoveryGovernancePresetPersistSharedState() {
        EntityDiscoveryGovernancePresetInfo presetInfo = new EntityDiscoveryGovernancePresetInfo();
        presetInfo.setId("preset-prod");
        presetInfo.setName("Prod governance baseline");
        presetInfo.setOwner("catalog-oncall");
        presetInfo.setSystem("commerce-platform");
        presetInfo.setEnvironment("prod");
        presetInfo.setStatus("healthy");
        presetInfo.setBulkOwner("catalog-oncall");
        presetInfo.setBulkSystem("commerce-platform");

        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKey("discovery", "preset", "preset-prod"))
                .thenReturn(Optional.empty());
        when(entityGovernanceStateDao.saveAndFlush(any(EntityGovernanceState.class))).thenAnswer(invocation -> {
            EntityGovernanceState state = invocation.getArgument(0);
            state.setCreator("admin");
            state.setGmtCreate(LocalDateTime.of(2026, 3, 17, 10, 0));
            state.setGmtUpdate(LocalDateTime.of(2026, 3, 17, 10, 5));
            return state;
        });

        EntityDiscoveryGovernancePresetInfo saved = observeEntityService.saveDiscoveryGovernancePreset(presetInfo);

        assertEquals("preset-prod", saved.getId());
        assertEquals("Prod governance baseline", saved.getName());
        assertEquals("catalog-oncall", saved.getOwner());
        assertEquals("commerce-platform", saved.getSystem());
        assertEquals("admin", saved.getCreator());
        verify(entityGovernanceStateDao, times(1)).saveAndFlush(any(EntityGovernanceState.class));
    }

    @Test
    void saveAndGetDefinitionWorkspaceResumePersistSharedState() {
        EntityDefinitionWorkspaceResumeInfo resumeInfo = new EntityDefinitionWorkspaceResumeInfo();
        resumeInfo.setToken("definition-resume-1");
        resumeInfo.setContent("apiVersion: hertzbeat/v1");
        resumeInfo.setFormat("yaml");
        resumeInfo.setSource("telemetry");
        resumeInfo.setCount(2);
        resumeInfo.setOwnerDraft("catalog-oncall");
        resumeInfo.setSystemDraft("commerce-platform");
        resumeInfo.setRunbookDraft("https://runbook.example.com/catalog");
        resumeInfo.setQueryParams(Map.of("format", "yaml", "seedActivity", "activity-1"));

        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKey("definition", "resume", "definition-resume-1"))
                .thenReturn(Optional.empty(), Optional.of(EntityGovernanceState.builder()
                        .stateScope("definition")
                        .stateKind("resume")
                        .stateKey("definition-resume-1")
                        .stateName("telemetry")
                        .status("yaml")
                        .content(JsonUtil.fromJson("""
                                {
                                  "content":"apiVersion: hertzbeat/v1",
                                  "format":"yaml",
                                  "source":"telemetry",
                                  "count":2,
                                  "ownerDraft":"catalog-oncall",
                                  "systemDraft":"commerce-platform",
                                  "runbookDraft":"https://runbook.example.com/catalog",
                                  "queryParams":{"format":"yaml","seedActivity":"activity-1"}
                                }
                                """))
                        .creator("admin")
                        .gmtCreate(LocalDateTime.of(2026, 3, 18, 8, 0))
                        .gmtUpdate(LocalDateTime.of(2026, 3, 18, 8, 5))
                        .build()));
        when(entityGovernanceStateDao.saveAndFlush(any(EntityGovernanceState.class))).thenAnswer(invocation -> {
            EntityGovernanceState state = invocation.getArgument(0);
            state.setCreator("admin");
            state.setGmtCreate(LocalDateTime.of(2026, 3, 18, 8, 0));
            state.setGmtUpdate(LocalDateTime.of(2026, 3, 18, 8, 5));
            return state;
        });

        EntityDefinitionWorkspaceResumeInfo saved = observeEntityService.saveDefinitionWorkspaceResume(resumeInfo);
        EntityDefinitionWorkspaceResumeInfo loaded = observeEntityService.getDefinitionWorkspaceResume("definition-resume-1");

        assertEquals("definition-resume-1", saved.getToken());
        assertEquals("telemetry", saved.getSource());
        assertEquals("catalog-oncall", saved.getOwnerDraft());
        assertEquals("activity-1", loaded.getQueryParams().get("seedActivity"));
        assertEquals("admin", loaded.getCreator());
        verify(entityGovernanceStateDao, times(1)).saveAndFlush(any(EntityGovernanceState.class));
    }

    @Test
    void getDiscoveryGovernanceActivitiesRestoreSeedBundle() {
        EntityGovernanceState state = EntityGovernanceState.builder()
                .stateScope("discovery")
                .stateKind("activity")
                .stateKey("activity-1")
                .stateName("Bulk adopt")
                .status("success")
                .content(JsonUtil.fromJson("""
                        {
                          "action":"bulk-adopt-definition",
                          "summary":"Adopted into definition workspace",
                          "detail":"2 rows seeded",
                          "workspacePath":"/entities/import?format=json&seedSource=telemetry&seedActivity=activity-1",
                          "seedDefinitionDraft":"[{\\\"apiVersion\\\":\\\"v3\\\"}]",
                          "seedDefinitionFormat":"json",
                          "seedDefinitionSource":"telemetry",
                          "seedDefinitionCount":2,
                          "entityRefs":[{"entityId":101,"entityName":"checkout-api"}]
                        }
                        """))
                .creator("admin")
                .gmtCreate(LocalDateTime.of(2026, 3, 17, 11, 0))
                .gmtUpdate(LocalDateTime.of(2026, 3, 17, 11, 3))
                .build();
        when(entityGovernanceStateDao.findByStateScopeAndStateKindAndStateKey("discovery", "activity", "activity-1"))
                .thenReturn(Optional.of(state));

        List<EntityDiscoveryGovernanceActivityInfo> activities = observeEntityService.getDiscoveryGovernanceActivities("activity-1", 8);

        assertEquals(1, activities.size());
        EntityDiscoveryGovernanceActivityInfo activity = activities.getFirst();
        assertEquals("activity-1", activity.getId());
        assertEquals("bulk-adopt-definition", activity.getAction());
        assertEquals("telemetry", activity.getSeedDefinitionSource());
        assertEquals(2, activity.getSeedDefinitionCount());
        assertEquals(1, activity.getEntityRefs().size());
        assertEquals(101L, activity.getEntityRefs().getFirst().getEntityId());
    }

    @Test
    void getMonitorBindingCandidatesMatchDatabaseMonitorByServiceName() {
        Monitor monitor = new Monitor();
        monitor.setId(102L);
        monitor.setApp("mysql");
        monitor.setName("orders-db");
        monitor.setInstance("127.0.0.1:3306");
        when(monitorDao.findById(102L)).thenReturn(Optional.of(monitor));

        EntityIdentity serviceNameIdentity = EntityIdentity.builder()
                .entityId(2L)
                .identityKey("service.name")
                .identityValue("orders-db")
                .normalizedValue("orders-db")
                .priority(90)
                .primaryIdentity(true)
                .build();
        when(entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(any(Set.class), any(Set.class)))
                .thenReturn(List.of(serviceNameIdentity));
        when(entityMonitorBindDao.findAllByMonitorId(102L)).thenReturn(Collections.emptyList());

        ObserveEntity entity = ObserveEntity.builder()
                .id(2L)
                .type("database")
                .name("orders-db")
                .displayName("Orders DB")
                .status("unknown")
                .source("otel_resource")
                .build();
        when(observeEntityDao.findAllById(Set.of(2L))).thenReturn(List.of(entity));

        List<EntityMonitorBindingCandidate> candidates = observeEntityService.getMonitorBindingCandidates(102L);

        assertEquals(1, candidates.size());
        EntityMonitorBindingCandidate candidate = candidates.getFirst();
        assertEquals(2L, candidate.getEntityId());
        assertTrue(candidate.getMatchedIdentities().containsKey("service.name"));
        assertEquals("direct", candidate.getRecommendation());
        assertFalse(candidate.isAlreadyBound());
    }

    @Test
    void getMonitorBindingCandidatesMatchQueueMonitorByMessagingDestination() {
        Monitor monitor = new Monitor();
        monitor.setId(104L);
        monitor.setApp("kafka");
        monitor.setName("orders-events");
        monitor.setInstance("broker-a:9092");
        when(monitorDao.findById(104L)).thenReturn(Optional.of(monitor));

        EntityIdentity queueIdentity = EntityIdentity.builder()
                .entityId(4L)
                .identityKey("messaging.destination.name")
                .identityValue("orders-events")
                .normalizedValue("orders-events")
                .priority(120)
                .primaryIdentity(true)
                .build();
        when(entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(any(Set.class), any(Set.class)))
                .thenReturn(List.of(queueIdentity));
        when(entityMonitorBindDao.findAllByMonitorId(104L)).thenReturn(Collections.emptyList());

        ObserveEntity entity = ObserveEntity.builder()
                .id(4L)
                .type("queue")
                .name("orders-events")
                .displayName("Orders Events Queue")
                .status("unknown")
                .source("otel_resource")
                .build();
        when(observeEntityDao.findAllById(Set.of(4L))).thenReturn(List.of(entity));

        List<EntityMonitorBindingCandidate> candidates = observeEntityService.getMonitorBindingCandidates(104L);

        assertEquals(1, candidates.size());
        EntityMonitorBindingCandidate candidate = candidates.getFirst();
        assertEquals(4L, candidate.getEntityId());
        assertTrue(candidate.getMatchedIdentities().containsKey("messaging.destination.name"));
        assertEquals("direct", candidate.getRecommendation());
        assertFalse(candidate.isAlreadyBound());
    }

    @Test
    void getMonitorBindingCandidatesMarkAlreadyBoundMonitor() {
        Monitor monitor = new Monitor();
        monitor.setId(103L);
        monitor.setApp("website");
        monitor.setName("checkout-site");
        monitor.setInstance("https://checkout.example.com");
        monitor.setLabels(Map.of("endpoint.url", "https://checkout.example.com"));
        when(monitorDao.findById(103L)).thenReturn(Optional.of(monitor));

        EntityIdentity endpointIdentity = EntityIdentity.builder()
                .entityId(3L)
                .identityKey("endpoint.url")
                .identityValue("https://checkout.example.com")
                .normalizedValue("https://checkout.example.com")
                .priority(90)
                .primaryIdentity(true)
                .build();
        when(entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(any(Set.class), any(Set.class)))
                .thenReturn(List.of(endpointIdentity));
        when(entityMonitorBindDao.findAllByMonitorId(103L)).thenReturn(List.of(EntityMonitorBind.builder()
                .entityId(3L)
                .monitorId(103L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build()));

        ObserveEntity entity = ObserveEntity.builder()
                .id(3L)
                .type("endpoint")
                .name("checkout-site")
                .displayName("Checkout Site")
                .status("unknown")
                .source("otel_resource")
                .build();
        when(observeEntityDao.findAllById(Set.of(3L))).thenReturn(List.of(entity));

        List<EntityMonitorBindingCandidate> candidates = observeEntityService.getMonitorBindingCandidates(103L);

        assertEquals(1, candidates.size());
        assertTrue(candidates.getFirst().isAlreadyBound());
    }

    @Test
    void getEntityDetailAggregateCriticalStatusFromActiveAlerts() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(1L)
                .type("service")
                .name("payment-service")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(1L)).thenReturn(Optional.of(entity));
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EntityIdentity identity = EntityIdentity.builder()
                .entityId(1L)
                .identityKey("service.name")
                .identityValue("payment-service")
                .normalizedValue("payment-service")
                .priority(90)
                .primaryIdentity(true)
                .build();
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(1L)).thenReturn(List.of(identity));
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(1L, 1L)).thenReturn(Collections.emptyList());
        when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(1L)
                .monitorId(101L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(1L)).thenReturn(List.of(bind));

        Monitor monitor = Monitor.builder()
                .id(101L)
                .name("payment-service")
                .app("springboot3")
                .instance("payment-service.default.svc.cluster.local")
                .status(CommonConstants.MONITOR_UP_CODE)
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(101L))).thenReturn(List.of(monitor));

        SingleAlert singleAlert = SingleAlert.builder()
                .id(10L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .content("payment-service error rate high")
                .labels(Map.of("severity", "critical"))
                .build();
        when(singleAlertDao.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(singleAlert)));

        EntityDetailDto detail = observeEntityService.getEntityDetail(1L);

        assertEquals("critical", detail.getStatus().getStatus());
        assertEquals(1, detail.getStatus().getActiveAlertCount());
        assertEquals(1, detail.getBoundMonitors().size());
        assertEquals(1, detail.getActiveAlerts().size());
        assertFalse(detail.getLogQueryHints().isEmpty());
        assertNotNull(detail.getResponseHandoffs());
        assertEquals("/entities/1", detail.getResponseHandoffs().getAlerts().getReturnTo());
        assertEquals("critical", detail.getResponseHandoffs().getAlerts().getSeverity());
        assertEquals("firing", detail.getResponseHandoffs().getAlerts().getStatus());
        assertEquals("payment-service", detail.getResponseHandoffs().getLogs().getSearch());
    }

    @Test
    void getEntityDetailFiltersActiveAlertsByRequestWorkspaceLabels() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(73L)
                .type("service")
                .name("checkout-api")
                .workspaceId("team-a")
                .build();
        when(observeEntityDao.findById(73L)).thenReturn(Optional.of(entity));
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(73L)).thenReturn(Collections.emptyList());
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(73L, 73L)).thenReturn(Collections.emptyList());
        when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(73L)
                .monitorId(7301L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(73L)).thenReturn(List.of(bind));

        Monitor monitor = Monitor.builder()
                .id(7301L)
                .name("checkout-api")
                .app("springboot3")
                .instance("checkout.default.svc.cluster.local")
                .status(CommonConstants.MONITOR_UP_CODE)
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(7301L))).thenReturn(List.of(monitor));

        SingleAlert teamBetaAlert = SingleAlert.builder()
                .id(7302L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .content("checkout-api latency high")
                .labels(Map.of("workspace_id", "team-b", "severity", "critical"))
                .build();
        SingleAlert teamAlphaAlert = SingleAlert.builder()
                .id(7303L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .content("checkout-api error burst")
                .labels(Map.of("hertzbeat.workspace_id", "team-a", "severity", "warning"))
                .build();
        when(singleAlertDao.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(teamBetaAlert, teamAlphaAlert)));

        AuthTokenRequestContext.bindWorkspaceId("team-a");

        EntityDetailDto detail = observeEntityService.getEntityDetail(73L);

        assertEquals(1, detail.getActiveAlerts().size());
        assertEquals(7303L, detail.getActiveAlerts().getFirst().getId());
        assertEquals(1, detail.getStatus().getActiveAlertCount());
    }

    @Test
    void getEntityDetailAndDefinitionReturnNullForDifferentRequestWorkspace() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(71L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .source("manual")
                .workspaceId("team-b")
                .build();
        when(observeEntityDao.findById(71L)).thenReturn(Optional.of(entity));
        lenient().when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(71L))
                .thenReturn(Collections.emptyList());
        lenient().when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(71L, 71L))
                .thenReturn(Collections.emptyList());
        lenient().when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(71L))
                .thenReturn(Collections.emptyList());
        lenient().when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        AuthTokenRequestContext.bindWorkspaceId("team-a");

        assertNull(observeEntityService.getEntityDetail(71L));
        assertNull(observeEntityService.getEntityDefinition(71L, "yaml"));
        verify(entityIdentityDao, times(0)).findAllByEntityIdOrderByPriorityDescIdAsc(71L);
        verify(entityMonitorBindDao, times(0)).findAllByEntityIdOrderByIdAsc(71L);
    }

    @Test
    void entityEvidenceEndpointsReturnEmptyForDifferentRequestWorkspace() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(72L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .source("manual")
                .workspaceId("team-b")
                .build();
        when(observeEntityDao.findById(72L)).thenReturn(Optional.of(entity));
        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(72L)
                .monitorId(7201L)
                .build();
        lenient().when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(72L)).thenReturn(List.of(bind));
        Monitor monitor = Monitor.builder()
                .id(7201L)
                .name("checkout-api")
                .app("springboot3")
                .status(CommonConstants.MONITOR_DOWN_CODE)
                .build();
        lenient().when(monitorDao.findMonitorsByIdIn(Set.of(7201L))).thenReturn(List.of(monitor));
        SingleAlert alert = SingleAlert.builder()
                .id(7202L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .content("checkout-api latency high")
                .build();
        lenient().when(singleAlertDao.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(alert));
        EntityDefinitionActivity activity = EntityDefinitionActivity.builder()
                .id(7203L)
                .entityId(72L)
                .activityType("definition_update")
                .status("success")
                .summary("Updated definition")
                .build();
        lenient().when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(List.of(activity));

        AuthTokenRequestContext.bindWorkspaceId("team-a");

        assertTrue(observeEntityService.getEntityAlerts(72L, null, null, 0, 10).isEmpty());
        assertTrue(observeEntityService.getEntityMonitors(72L, null, null, 0, 10).isEmpty());
        assertTrue(observeEntityService.getDefinitionActivities(72L, 10).isEmpty());
    }

    @Test
    void getEntityDetailNormalizesLegacyApiEndpointType() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(9L)
                .type("endpoint")
                .name("legacy-api-endpoint-verify")
                .subtype("public-api")
                .implementedBy(List.of("service:commerce/legacy-checkout-api"))
                .apiInterface(JsonUtil.fromJson("""
                        {
                          "fileRef": "openapi/legacy-checkout.yaml"
                        }
                        """))
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(9L)).thenReturn(Optional.of(entity));
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(9L)).thenReturn(Collections.emptyList());
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(9L, 9L)).thenReturn(Collections.emptyList());
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(9L)).thenReturn(Collections.emptyList());
        when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        EntityDetailDto detail = observeEntityService.getEntityDetail(9L);

        assertEquals("api", detail.getEntity().getEntity().getType());
    }

    @Test
    void getEntityDetailBuildsOpsWorkspaceSummaries() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(11L)
                .type("service")
                .name("checkout-api")
                .owner("catalog-oncall")
                .runbook("https://runbook.example.com/checkout")
                .system("commerce-platform")
                .labels(Map.of("status.page.component", "checkout-api"))
                .status("unknown")
                .source("manual")
                .gmtUpdate(LocalDateTime.of(2026, 3, 19, 9, 0))
                .build();
        when(observeEntityDao.findById(11L)).thenReturn(Optional.of(entity));
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        EntityIdentity identity = EntityIdentity.builder()
                .entityId(11L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .priority(90)
                .primaryIdentity(true)
                .build();
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(11L)).thenReturn(List.of(identity));

        EntityRelation relation = EntityRelation.builder()
                .sourceEntityId(11L)
                .targetEntityId(12L)
                .relationType("depends_on")
                .build();
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(11L, 11L)).thenReturn(List.of(relation));

        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(11L)
                .monitorId(201L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(11L)).thenReturn(List.of(bind));

        Monitor downMonitor = Monitor.builder()
                .id(201L)
                .name("checkout-api")
                .app("springboot3")
                .instance("checkout.default.svc.cluster.local")
                .status(CommonConstants.MONITOR_DOWN_CODE)
                .gmtUpdate(LocalDateTime.of(2026, 3, 19, 8, 50))
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(201L))).thenReturn(List.of(downMonitor));

        SingleAlert alert = SingleAlert.builder()
                .id(301L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .content("checkout-api error rate high")
                .labels(Map.of("severity", "critical"))
                .activeAt(1_763_564_000_000L)
                .build();
        when(singleAlertDao.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(alert)));

        EntityDetailDto detail = observeEntityService.getEntityDetail(11L);

        assertEquals(1, detail.getEvidenceSummary().getActiveAlertCount());
        assertEquals(1, detail.getEvidenceSummary().getDownMonitorCount());
        assertEquals(1, detail.getEvidenceSummary().getIdentityCount());
        assertEquals(2, detail.getEvidenceSummary().getLogHintCount());
        assertEquals(1, detail.getAlertSummary().getTotalActiveAlerts());
        assertEquals(1, detail.getMonitorSummary().getTotalBoundMonitors());
        assertEquals(1, detail.getMonitorSummary().getAbnormalMonitors().size());
        assertEquals("otel-resource", detail.getLogSummary().getPreferredQueryType());
        assertNotNull(detail.getUnifiedEvidenceSummary());
        assertEquals(2, detail.getUnifiedEvidenceSummary().getActiveSignalCount());
        assertTrue(detail.getUnifiedEvidenceSummary().isMetricsActive());
        assertTrue(detail.getUnifiedEvidenceSummary().isLogsActive());
        assertFalse(detail.getUnifiedEvidenceSummary().isTracesActive());
        assertNotNull(detail.getTriageRecommendation());
        assertEquals("metrics", detail.getTriageRecommendation().getRecommendedFocus());
        assertEquals("View monitors", detail.getTriageRecommendation().getActionLabel());
        assertTrue(detail.getOpsSummary().isOwnerReady());
        assertTrue(detail.getOpsSummary().isRunbookReady());
        assertTrue(detail.getOpsSummary().isRelationReady());
        assertTrue(detail.getOpsSummary().isTelemetryReady());
        assertTrue(detail.getOpsSummary().isStatusReady());
        assertEquals(100, detail.getOpsSummary().getReadinessScore());
        assertEquals("review_alerts", detail.getNextActions().getFirst().getActionType());
        assertTrue(detail.getStatusPageSummary().isLinked());
        assertEquals(1, detail.getStatusPageSummary().getComponentCount());
        assertNotNull(detail.getResponseHandoffs());
        assertEquals("/entities/11", detail.getResponseHandoffs().getAlerts().getReturnTo());
        assertEquals("checkout-api", detail.getResponseHandoffs().getAlerts().getSearch());
        assertEquals("critical", detail.getResponseHandoffs().getAlerts().getSeverity());
        assertEquals("springboot3", detail.getResponseHandoffs().getMonitors().getApp());
        assertEquals(String.valueOf(CommonConstants.MONITOR_DOWN_CODE), detail.getResponseHandoffs().getMonitors().getStatus());
        assertEquals("checkout.default.svc.cluster.local", detail.getResponseHandoffs().getMonitors().getContent());
        assertEquals("checkout-api", detail.getResponseHandoffs().getLogs().getSearch());
        assertEquals("critical", detail.getResponseHandoffs().getLogs().getSeverityText());
        assertEquals("checkout-api", detail.getResponseHandoffs().getDiscovery().getQuery());
        assertEquals("catalog-oncall", detail.getResponseHandoffs().getDiscovery().getOwner());
        assertEquals("commerce-platform", detail.getResponseHandoffs().getDiscovery().getSystem());
        assertEquals("basic", detail.getResponseHandoffs().getEditor().getFocus());
    }

    @Test
    void getEntityDetailBuildsNoiseControlSummaryFromMatchedRules() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(14L)
                .type("service")
                .name("noise-control-api")
                .environment("prod")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(14L)).thenReturn(Optional.of(entity));
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(14L)).thenReturn(Collections.emptyList());
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(14L, 14L)).thenReturn(Collections.emptyList());

        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(14L)
                .monitorId(401L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(14L)).thenReturn(List.of(bind));

        Monitor monitor = Monitor.builder()
                .id(401L)
                .name("noise-control-api")
                .app("springboot3")
                .instance("noise-control-api.default.svc.cluster.local")
                .status(CommonConstants.MONITOR_UP_CODE)
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(401L))).thenReturn(List.of(monitor));

        SingleAlert alert = SingleAlert.builder()
                .id(501L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .content("noise-control-api latency high")
                .labels(Map.of(
                        "severity", "critical",
                        CommonConstants.LABEL_INSTANCE, "noise-control-api.default.svc.cluster.local",
                        "service.name", "noise-control-api.default.svc.cluster.local"))
                .build();
        when(singleAlertDao.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(alert)));

        AlertSilence silence = AlertSilence.builder()
                .id(901L)
                .name("noise-control-api silence")
                .enable(true)
                .matchAll(false)
                .type((byte) 0)
                .labels(Map.of(CommonConstants.LABEL_INSTANCE, "noise-control-api.default.svc.cluster.local"))
                .gmtUpdate(LocalDateTime.of(2026, 3, 20, 10, 0))
                .build();
        AlertInhibit inhibit = AlertInhibit.builder()
                .id(902L)
                .name("noise-control-api inhibit")
                .enable(true)
                .targetLabels(Map.of(CommonConstants.LABEL_INSTANCE, "noise-control-api.default.svc.cluster.local"))
                .equalLabels(List.of(CommonConstants.LABEL_INSTANCE))
                .gmtUpdate(LocalDateTime.of(2026, 3, 20, 10, 5))
                .build();
        when(alertSilenceDao.findAll()).thenReturn(List.of(silence));
        when(alertInhibitDao.findAll()).thenReturn(List.of(inhibit));

        EntityDetailDto detail = observeEntityService.getEntityDetail(14L);

        assertNotNull(detail.getNoiseControlSummary());
        assertEquals(1, detail.getNoiseControlSummary().getActiveSilenceCount());
        assertEquals(1, detail.getNoiseControlSummary().getMatchingInhibitCount());
        assertFalse(detail.getNoiseControlSummary().isPossibleAlertSuppression());
        assertEquals("noise-control-api silence", detail.getNoiseControlSummary().getActiveSilences().getFirst().getName());
        assertEquals("silence", detail.getNoiseControlSummary().getActiveSilences().getFirst().getType());
        assertEquals("noise-control-api inhibit", detail.getNoiseControlSummary().getMatchingInhibits().getFirst().getName());
        assertEquals("inhibit", detail.getNoiseControlSummary().getMatchingInhibits().getFirst().getType());
    }

    @Test
    void getEntityDetailFiltersNoiseControlRulesByRequestWorkspace() {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        ObserveEntity entity = ObserveEntity.builder()
                .id(141L)
                .type("service")
                .name("noise-control-api")
                .environment("prod")
                .status("unknown")
                .source("manual")
                .workspaceId("team-a")
                .build();
        when(observeEntityDao.findById(141L)).thenReturn(Optional.of(entity));
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(141L)).thenReturn(Collections.emptyList());
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(141L, 141L)).thenReturn(Collections.emptyList());

        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(141L)
                .monitorId(1401L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(141L)).thenReturn(List.of(bind));

        Monitor monitor = Monitor.builder()
                .id(1401L)
                .name("noise-control-api")
                .app("springboot3")
                .instance("noise-control-api.default.svc.cluster.local")
                .status(CommonConstants.MONITOR_UP_CODE)
                .labels(Map.of("hertzbeat.workspace_id", "team-a"))
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(1401L))).thenReturn(List.of(monitor));
        when(singleAlertDao.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        AlertSilence globalMatchAll = AlertSilence.builder()
                .id(910L)
                .name("global silence")
                .enable(true)
                .matchAll(true)
                .type((byte) 0)
                .gmtUpdate(LocalDateTime.of(2026, 4, 1, 10, 0))
                .build();
        AlertSilence teamBetaSilence = AlertSilence.builder()
                .id(911L)
                .name("team-b silence")
                .enable(true)
                .matchAll(false)
                .type((byte) 0)
                .labels(Map.of(
                        "hertzbeat.workspace_id", "team-b",
                        CommonConstants.LABEL_INSTANCE, "noise-control-api.default.svc.cluster.local"))
                .gmtUpdate(LocalDateTime.of(2026, 4, 1, 10, 5))
                .build();
        AlertSilence teamAlphaSilence = AlertSilence.builder()
                .id(912L)
                .name("team-a silence")
                .enable(true)
                .matchAll(false)
                .type((byte) 0)
                .labels(Map.of(
                        "hertzbeat.workspace_id", "team-a",
                        CommonConstants.LABEL_INSTANCE, "noise-control-api.default.svc.cluster.local"))
                .gmtUpdate(LocalDateTime.of(2026, 4, 1, 10, 10))
                .build();
        AlertInhibit genericInhibit = AlertInhibit.builder()
                .id(920L)
                .name("generic inhibit")
                .enable(true)
                .targetLabels(Map.of(CommonConstants.LABEL_INSTANCE, "noise-control-api.default.svc.cluster.local"))
                .equalLabels(List.of(CommonConstants.LABEL_INSTANCE))
                .gmtUpdate(LocalDateTime.of(2026, 4, 1, 10, 15))
                .build();
        AlertInhibit teamBetaInhibit = AlertInhibit.builder()
                .id(921L)
                .name("team-b inhibit")
                .enable(true)
                .targetLabels(Map.of(
                        "hertzbeat.workspace_id", "team-b",
                        CommonConstants.LABEL_INSTANCE, "noise-control-api.default.svc.cluster.local"))
                .equalLabels(List.of(CommonConstants.LABEL_INSTANCE))
                .gmtUpdate(LocalDateTime.of(2026, 4, 1, 10, 20))
                .build();
        AlertInhibit teamAlphaInhibit = AlertInhibit.builder()
                .id(922L)
                .name("team-a inhibit")
                .enable(true)
                .targetLabels(Map.of(
                        "hertzbeat.workspace_id", "team-a",
                        CommonConstants.LABEL_INSTANCE, "noise-control-api.default.svc.cluster.local"))
                .equalLabels(List.of(CommonConstants.LABEL_INSTANCE))
                .gmtUpdate(LocalDateTime.of(2026, 4, 1, 10, 25))
                .build();
        when(alertSilenceDao.findAll()).thenReturn(List.of(globalMatchAll, teamBetaSilence, teamAlphaSilence));
        when(alertInhibitDao.findAll()).thenReturn(List.of(genericInhibit, teamBetaInhibit, teamAlphaInhibit));

        EntityDetailDto detail = observeEntityService.getEntityDetail(141L);

        assertNotNull(detail.getNoiseControlSummary());
        assertEquals(1, detail.getNoiseControlSummary().getActiveSilenceCount());
        assertEquals("team-a silence", detail.getNoiseControlSummary().getActiveSilences().getFirst().getName());
        assertEquals(1, detail.getNoiseControlSummary().getMatchingInhibitCount());
        assertEquals("team-a inhibit", detail.getNoiseControlSummary().getMatchingInhibits().getFirst().getName());
        assertTrue(detail.getNoiseControlSummary().isPossibleAlertSuppression());
    }

    @Test
    void getEntityDetailPrefersSharedActiveAlertLabelsForAlertHandoffSearch() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(13L)
                .type("service")
                .name("usability-api-audit")
                .displayName("Usability API Audit")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(13L)).thenReturn(Optional.of(entity));
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        EntityIdentity identity = EntityIdentity.builder()
                .entityId(13L)
                .identityKey("service.name")
                .identityValue("usability-hardening-audit-1773993087563")
                .normalizedValue("usability-hardening-audit-1773993087563")
                .priority(90)
                .primaryIdentity(true)
                .build();
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(13L)).thenReturn(List.of(identity));
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(13L, 13L)).thenReturn(Collections.emptyList());

        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(13L)
                .monitorId(301L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(13L)).thenReturn(List.of(bind));

        Monitor boundMonitor = Monitor.builder()
                .id(301L)
                .name("ops-discovery-biz-1773878478")
                .app("https")
                .instance("example.biz:443")
                .status(CommonConstants.MONITOR_UP_CODE)
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(301L))).thenReturn(List.of(boundMonitor));

        SingleAlert firstAlert = SingleAlert.builder()
                .id(401L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .content("ui smoke firing on example.biz:443")
                .labels(Map.of(
                        "severity", "critical",
                        CommonConstants.LABEL_INSTANCE, "example.biz:443",
                        CommonConstants.LABEL_INSTANCE_NAME, "ops-discovery-biz-1773878478",
                        "service.name", "example.biz:443"))
                .gmtUpdate(LocalDateTime.of(2026, 3, 20, 9, 0))
                .build();
        SingleAlert secondAlert = SingleAlert.builder()
                .id(402L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .content("feedback smoke firing on example.biz:443")
                .labels(Map.of(
                        "severity", "critical",
                        CommonConstants.LABEL_INSTANCE, "example.biz:443",
                        CommonConstants.LABEL_INSTANCE_NAME, "ops-discovery-biz-1773878478",
                        "service.name", "entity-alert-feedback-smoke-1773926536"))
                .gmtUpdate(LocalDateTime.of(2026, 3, 20, 8, 55))
                .build();
        when(singleAlertDao.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(firstAlert, secondAlert)));

        EntityDetailDto detail = observeEntityService.getEntityDetail(13L);

        assertEquals("example.biz:443", detail.getResponseHandoffs().getAlerts().getSearch());
        assertEquals("critical", detail.getResponseHandoffs().getAlerts().getSeverity());
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, detail.getResponseHandoffs().getAlerts().getStatus());
    }

    @Test
    void getEntityDetailReturnsEmptyOpsWorkspaceSummariesWithoutEvidence() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(12L)
                .type("service")
                .name("empty-service")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(12L)).thenReturn(Optional.of(entity));
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(12L)).thenReturn(Collections.emptyList());
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(12L, 12L)).thenReturn(Collections.emptyList());
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(12L)).thenReturn(Collections.emptyList());
        when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        EntityDetailDto detail = observeEntityService.getEntityDetail(12L);

        assertNotNull(detail.getEvidenceSummary());
        assertEquals(0, detail.getEvidenceSummary().getActiveAlertCount());
        assertEquals(0, detail.getEvidenceSummary().getDownMonitorCount());
        assertEquals(0, detail.getEvidenceSummary().getHealthyMonitorCount());
        assertEquals(0, detail.getEvidenceSummary().getIdentityCount());
        assertEquals(0, detail.getEvidenceSummary().getLogHintCount());
        assertNotNull(detail.getAlertSummary());
        assertEquals(0, detail.getAlertSummary().getTotalActiveAlerts());
        assertTrue(detail.getAlertSummary().getRecentAlerts().isEmpty());
        assertNotNull(detail.getMonitorSummary());
        assertEquals(0, detail.getMonitorSummary().getTotalBoundMonitors());
        assertTrue(detail.getMonitorSummary().getAbnormalMonitors().isEmpty());
        assertNotNull(detail.getLogSummary());
        assertEquals(0, detail.getLogSummary().getHintCount());
        assertNotNull(detail.getUnifiedEvidenceSummary());
        assertEquals(0, detail.getUnifiedEvidenceSummary().getActiveSignalCount());
        assertFalse(detail.getUnifiedEvidenceSummary().isMetricsActive());
        assertFalse(detail.getUnifiedEvidenceSummary().isLogsActive());
        assertFalse(detail.getUnifiedEvidenceSummary().isTracesActive());
        assertNotNull(detail.getTriageRecommendation());
        assertEquals("evidence", detail.getTriageRecommendation().getRecommendedFocus());
        assertNotNull(detail.getOpsSummary());
        assertFalse(detail.getOpsSummary().isOwnerReady());
        assertFalse(detail.getOpsSummary().isRunbookReady());
        assertFalse(detail.getOpsSummary().isRelationReady());
        assertFalse(detail.getOpsSummary().isTelemetryReady());
        assertFalse(detail.getOpsSummary().isStatusReady());
        assertNotNull(detail.getNextActions());
        assertFalse(detail.getNextActions().isEmpty());
        assertNotNull(detail.getStatusPageSummary());
        assertFalse(detail.getStatusPageSummary().isLinked());
        assertNotNull(detail.getResponseHandoffs());
        assertEquals("/entities/12", detail.getResponseHandoffs().getAlerts().getReturnTo());
        assertEquals("empty-service", detail.getResponseHandoffs().getAlerts().getSearch());
        assertNull(detail.getResponseHandoffs().getAlerts().getSeverity());
        assertNull(detail.getResponseHandoffs().getMonitors().getStatus());
        assertEquals("empty-service", detail.getResponseHandoffs().getLogs().getSearch());
        assertEquals("ownership", detail.getResponseHandoffs().getEditor().getFocus());
    }

    @Test
    void getEntityDetailIncludesOtlpMetricEvidenceWithoutBoundMonitors() {
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of("service.name", "checkout-api", "service.namespace", "commerce"),
                1_710_000_000_000L,
                "checkout_request_latency",
                "gauge",
                "ms",
                42.5,
                Map.of("instance", "e2e")
        );
        ObserveEntity entity = ObserveEntity.builder()
                .id(15L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(15L)).thenReturn(Optional.of(entity));
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(15L, 15L)).thenReturn(Collections.emptyList());
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(15L)).thenReturn(Collections.emptyList());
        when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(15L)).thenReturn(List.of(
                EntityIdentity.builder()
                        .entityId(15L)
                        .identityType("otel_resource")
                        .identityKey("service.name")
                        .identityValue("checkout-api")
                        .normalizedValue("checkout-api")
                        .priority(90)
                        .primaryIdentity(true)
                        .build(),
                EntityIdentity.builder()
                        .entityId(15L)
                        .identityType("otel_resource")
                        .identityKey("service.namespace")
                        .identityValue("commerce")
                        .normalizedValue("commerce")
                        .priority(80)
                        .primaryIdentity(false)
                        .build()
        ));

        EntityDetailDto detail = observeEntityService.getEntityDetail(15L);

        assertNotNull(detail.getUnifiedEvidenceSummary());
        assertTrue(detail.getUnifiedEvidenceSummary().isMetricsActive());
        assertEquals(1, detail.getUnifiedEvidenceSummary().getMetricEvidenceCount());
        assertFalse(detail.getUnifiedEvidenceSummary().isTracesActive());
        assertNotNull(detail.getTriageRecommendation());
        assertNotEquals("metrics", detail.getTriageRecommendation().getRecommendedFocus());
    }

    @Test
    void getEntityDetailBuildsUnifiedHandoffsFromSameTelemetryContext() {
        String traceId = "11111111111111111111111111111111";
        String spanId = "2222222222222222";
        telemetryIntakeService.recordOtlpLogIntake(
                Map.of(
                        "service.name", "checkout-api",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                1_710_000_000_000L,
                "checkout failed",
                "ERROR",
                traceId,
                spanId,
                Map.of("code.function", "CheckoutService.placeOrder")
        );
        telemetryIntakeService.recordOtlpTraceIntake(
                Map.of(
                        "service.name", "checkout-api",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                1_710_000_000_500L,
                traceId,
                spanId,
                "checkout",
                "error",
                Map.of("http.route", "/checkout")
        );
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout-api",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                1_710_000_001_000L,
                "checkout_request_latency",
                "gauge",
                "ms",
                42.5,
                Map.of("instance", "e2e")
        );

        ObserveEntity entity = ObserveEntity.builder()
                .id(16L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(16L)).thenReturn(Optional.of(entity));
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(16L, 16L)).thenReturn(Collections.emptyList());
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(16L)).thenReturn(Collections.emptyList());
        when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(16L)).thenReturn(List.of(
                EntityIdentity.builder()
                        .entityId(16L)
                        .identityType("otel_resource")
                        .identityKey("service.name")
                        .identityValue("checkout-api")
                        .normalizedValue("checkout-api")
                        .priority(90)
                        .primaryIdentity(true)
                        .build(),
                EntityIdentity.builder()
                        .entityId(16L)
                        .identityType("otel_resource")
                        .identityKey("service.namespace")
                        .identityValue("commerce")
                        .normalizedValue("commerce")
                        .priority(80)
                        .primaryIdentity(false)
                        .build(),
                EntityIdentity.builder()
                        .entityId(16L)
                        .identityType("otel_resource")
                        .identityKey("deployment.environment.name")
                        .identityValue("prod")
                        .normalizedValue("prod")
                        .priority(70)
                        .primaryIdentity(false)
                        .build()
        ));

        EntityDetailDto detail = observeEntityService.getEntityDetail(16L);

        assertEquals(traceId, detail.getResponseHandoffs().getLogs().getTraceId());
        assertEquals(spanId, detail.getResponseHandoffs().getLogs().getSpanId());
        assertEquals(traceId, detail.getLogQueryHints().getFirst().getTraceId());
        assertEquals(spanId, detail.getLogQueryHints().getFirst().getSpanId());
        assertEquals("checkout-api", detail.getResponseHandoffs().getTraces().getServiceName());
        assertEquals("checkout-api", detail.getResponseHandoffs().getMonitors().getServiceName());
        assertEquals("checkout-api", detail.getTraceQueryHints().getFirst().getServiceName());
    }

    @Test
    void getEntityDetailKeepsTraceHandoffPairConsistentWhenLatestObservationArrivesEarlier() {
        String errorTraceId = "12121212121212121212121212121212";
        String errorSpanId = "3434343434343434";
        String normalTraceId = "56565656565656565656565656565656";
        String normalSpanId = "7878787878787878";
        telemetryIntakeService.recordOtlpLogIntake(
                Map.of(
                        "service.name", "checkout-api",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                1_710_200_000_500L,
                "checkout failed",
                "ERROR",
                null,
                null,
                Map.of("code.function", "CheckoutService.placeOrder")
        );
        telemetryIntakeService.recordOtlpLogIntake(
                Map.of(
                        "service.name", "checkout-api",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                1_710_200_000_000L,
                "checkout healthy",
                "INFO",
                null,
                null,
                Map.of("http.route", "/health")
        );
        telemetryIntakeService.recordOtlpTraceIntake(
                Map.of(
                        "service.name", "checkout-api",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                1_710_200_000_500L,
                errorTraceId,
                errorSpanId,
                "checkout",
                "error",
                Map.of("http.route", "/checkout")
        );
        telemetryIntakeService.recordOtlpTraceIntake(
                Map.of(
                        "service.name", "checkout-api",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                1_710_200_000_000L,
                normalTraceId,
                normalSpanId,
                "health",
                "ok",
                Map.of("http.route", "/health")
        );
        telemetryIntakeService.recordOtlpMetricIntake(
                Map.of(
                        "service.name", "checkout-api",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                1_710_200_001_000L,
                "checkout_request_latency",
                "gauge",
                "ms",
                42.5,
                Map.of("instance", "e2e")
        );

        ObserveEntity entity = ObserveEntity.builder()
                .id(18L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(18L)).thenReturn(Optional.of(entity));
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(18L, 18L)).thenReturn(Collections.emptyList());
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(18L)).thenReturn(Collections.emptyList());
        when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(18L)).thenReturn(List.of(
                EntityIdentity.builder()
                        .entityId(18L)
                        .identityType("otel_resource")
                        .identityKey("service.name")
                        .identityValue("checkout-api")
                        .normalizedValue("checkout-api")
                        .priority(90)
                        .primaryIdentity(true)
                        .build(),
                EntityIdentity.builder()
                        .entityId(18L)
                        .identityType("otel_resource")
                        .identityKey("service.namespace")
                        .identityValue("commerce")
                        .normalizedValue("commerce")
                        .priority(80)
                        .primaryIdentity(false)
                        .build(),
                EntityIdentity.builder()
                        .entityId(18L)
                        .identityType("otel_resource")
                        .identityKey("deployment.environment.name")
                        .identityValue("prod")
                        .normalizedValue("prod")
                        .priority(70)
                        .primaryIdentity(false)
                        .build()
        ));

        EntityDetailDto detail = observeEntityService.getEntityDetail(18L);

        assertEquals(errorTraceId, detail.getTraceSummary().getLatestTraceId());
        assertEquals(errorTraceId, detail.getResponseHandoffs().getLogs().getTraceId());
        assertEquals(errorSpanId, detail.getResponseHandoffs().getLogs().getSpanId());
        assertEquals(errorTraceId, detail.getResponseHandoffs().getTraces().getTraceId());
        assertEquals(errorSpanId, detail.getResponseHandoffs().getTraces().getSpanId());
        assertEquals(errorTraceId, detail.getLogQueryHints().getFirst().getTraceId());
        assertEquals(errorSpanId, detail.getLogQueryHints().getFirst().getSpanId());
        assertEquals(errorTraceId, detail.getTraceQueryHints().getFirst().getTraceId());
        assertEquals(errorSpanId, detail.getTraceQueryHints().getFirst().getSpanId());
    }

    @Test
    void getEntityDetailFallsBackToTraceContextWhenLogEvidenceMissesTraceIds() {
        String traceId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        String spanId = "bbbbbbbbbbbbbbbb";
        telemetryIntakeService.recordOtlpLogIntake(
                Map.of(
                        "service.name", "checkout-api",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                1_710_100_000_000L,
                "checkout failed without explicit trace context",
                "ERROR",
                null,
                null,
                Map.of()
        );
        telemetryIntakeService.recordOtlpTraceIntake(
                Map.of(
                        "service.name", "checkout-api",
                        "service.namespace", "commerce",
                        "deployment.environment.name", "prod"
                ),
                1_710_100_000_500L,
                traceId,
                spanId,
                "checkout",
                "error",
                Map.of("http.route", "/checkout")
        );

        ObserveEntity entity = ObserveEntity.builder()
                .id(17L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(17L)).thenReturn(Optional.of(entity));
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(17L, 17L)).thenReturn(Collections.emptyList());
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(17L)).thenReturn(Collections.emptyList());
        when(entityDefinitionActivityDao.findAllByEntityId(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(17L)).thenReturn(List.of(
                EntityIdentity.builder()
                        .entityId(17L)
                        .identityType("otel_resource")
                        .identityKey("service.name")
                        .identityValue("checkout-api")
                        .normalizedValue("checkout-api")
                        .priority(90)
                        .primaryIdentity(true)
                        .build(),
                EntityIdentity.builder()
                        .entityId(17L)
                        .identityType("otel_resource")
                        .identityKey("service.namespace")
                        .identityValue("commerce")
                        .normalizedValue("commerce")
                        .priority(80)
                        .primaryIdentity(false)
                        .build(),
                EntityIdentity.builder()
                        .entityId(17L)
                        .identityType("otel_resource")
                        .identityKey("deployment.environment.name")
                        .identityValue("prod")
                        .normalizedValue("prod")
                        .priority(70)
                        .primaryIdentity(false)
                        .build()
        ));

        EntityDetailDto detail = observeEntityService.getEntityDetail(17L);

        assertEquals(traceId, detail.getResponseHandoffs().getLogs().getTraceId());
        assertEquals(spanId, detail.getResponseHandoffs().getLogs().getSpanId());
        assertEquals(traceId, detail.getLogQueryHints().getFirst().getTraceId());
        assertEquals(spanId, detail.getLogQueryHints().getFirst().getSpanId());
    }

    @Test
    void getEntityAlertsReturnsPagedActiveAlerts() {
        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(41L)
                .monitorId(401L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(41L)).thenReturn(List.of(bind));

        Monitor monitor = Monitor.builder()
                .id(401L)
                .name("checkout-api")
                .app("springboot3")
                .instance("checkout.default.svc.cluster.local")
                .status(CommonConstants.MONITOR_DOWN_CODE)
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(401L))).thenReturn(List.of(monitor));

        SingleAlert alert = SingleAlert.builder()
                .id(501L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .content("checkout-api latency high")
                .gmtUpdate(LocalDateTime.now())
                .build();
        SingleAlert secondAlert = SingleAlert.builder()
                .id(502L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .content("checkout-api error burst")
                .gmtUpdate(LocalDateTime.now().minusMinutes(1))
                .build();
        when(singleAlertDao.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(alert, secondAlert));

        var page = observeEntityService.getEntityAlerts(41L, null, null, 0, 1);

        assertEquals(2, page.getTotalElements());
        assertEquals(1, page.getContent().size());
        assertEquals(501L, page.getContent().getFirst().getId());
        assertEquals(1, page.getSize());
    }

    @Test
    void getEntityAlertsFilterByRequestWorkspaceLabels() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(47L)
                .type("service")
                .name("checkout-api")
                .workspaceId("team-a")
                .build();
        when(observeEntityDao.findById(47L)).thenReturn(Optional.of(entity));
        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(47L)
                .monitorId(407L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(47L)).thenReturn(List.of(bind));

        Monitor monitor = Monitor.builder()
                .id(407L)
                .name("checkout-api")
                .app("springboot3")
                .instance("checkout.default.svc.cluster.local")
                .status(CommonConstants.MONITOR_DOWN_CODE)
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(407L))).thenReturn(List.of(monitor));

        SingleAlert teamBetaAlert = SingleAlert.builder()
                .id(621L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .labels(Map.of("workspace_id", "team-b", "severity", "critical"))
                .content("checkout-api latency high")
                .build();
        SingleAlert legacyDefaultAlert = SingleAlert.builder()
                .id(622L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .labels(Map.of("severity", "warning"))
                .content("checkout-api warning")
                .build();
        SingleAlert teamAlphaAlert = SingleAlert.builder()
                .id(623L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .labels(Map.of("workspace_id", "team-a", "severity", "critical"))
                .content("checkout-api error burst")
                .build();
        when(singleAlertDao.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(teamBetaAlert, legacyDefaultAlert, teamAlphaAlert));

        AuthTokenRequestContext.bindWorkspaceId("team-a");

        var page = observeEntityService.getEntityAlerts(47L, null, null, 0, 10);

        assertEquals(1, page.getTotalElements());
        assertEquals(623L, page.getContent().getFirst().getId());
    }

    @Test
    void getEntityAlertsReturnsEmptyPageWhenNoMonitorsBound() {
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(42L)).thenReturn(Collections.emptyList());

        var page = observeEntityService.getEntityAlerts(42L, null, null, 0, 5);

        assertEquals(0, page.getTotalElements());
        assertTrue(page.getContent().isEmpty());
        assertEquals(5, page.getSize());
    }

    @Test
    void getEntityAlertsFiltersBySeverity() {
        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(43L)
                .monitorId(403L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(43L)).thenReturn(List.of(bind));

        Monitor monitor = Monitor.builder()
                .id(403L)
                .name("checkout-api")
                .app("springboot3")
                .instance("checkout.default.svc.cluster.local")
                .status(CommonConstants.MONITOR_DOWN_CODE)
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(403L))).thenReturn(List.of(monitor));

        SingleAlert criticalAlert = SingleAlert.builder()
                .id(601L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .labels(Map.of("severity", "critical"))
                .content("checkout-api latency high")
                .build();
        SingleAlert warningAlert = SingleAlert.builder()
                .id(602L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .labels(Map.of("severity", "warning"))
                .content("checkout-api latency warning")
                .build();
        when(singleAlertDao.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(criticalAlert, warningAlert));

        var page = observeEntityService.getEntityAlerts(43L, null, "critical", 0, 10);

        assertEquals(1, page.getTotalElements());
        assertEquals(1, page.getContent().size());
        assertEquals(601L, page.getContent().getFirst().getId());
    }

    @Test
    void getEntityAlertsAllowsResolvedStatusWorkbenchFilter() {
        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(45L)
                .monitorId(405L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(45L)).thenReturn(List.of(bind));

        Monitor monitor = Monitor.builder()
                .id(405L)
                .name("checkout-api")
                .app("springboot3")
                .instance("checkout.default.svc.cluster.local")
                .status(CommonConstants.MONITOR_DOWN_CODE)
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(405L))).thenReturn(List.of(monitor));

        SingleAlert resolvedAlert = SingleAlert.builder()
                .id(613L)
                .status(CommonConstants.ALERT_STATUS_RESOLVED)
                .labels(Map.of("severity", "warning"))
                .content("checkout-api recovered")
                .gmtUpdate(LocalDateTime.of(2026, 3, 19, 10, 10))
                .build();
        when(singleAlertDao.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(resolvedAlert));

        var page = observeEntityService.getEntityAlerts(45L, CommonConstants.ALERT_STATUS_RESOLVED, null, 0, 10);

        assertEquals(1, page.getTotalElements());
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, page.getContent().getFirst().getStatus());
    }

    @Test
    void getEntityAlertsAllowsAcknowledgedStatusWorkbenchFilter() {
        final String acknowledgedStatus = "acknowledged";
        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(46L)
                .monitorId(406L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(46L)).thenReturn(List.of(bind));

        Monitor monitor = Monitor.builder()
                .id(406L)
                .name("checkout-api")
                .app("springboot3")
                .instance("checkout.default.svc.cluster.local")
                .status(CommonConstants.MONITOR_DOWN_CODE)
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(406L))).thenReturn(List.of(monitor));

        SingleAlert acknowledgedAlert = SingleAlert.builder()
                .id(614L)
                .status(acknowledgedStatus)
                .labels(Map.of("severity", "warning"))
                .content("checkout-api acknowledged")
                .gmtUpdate(LocalDateTime.of(2026, 3, 19, 10, 15))
                .build();
        when(singleAlertDao.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(acknowledgedAlert));

        var page = observeEntityService.getEntityAlerts(46L, acknowledgedStatus, null, 0, 10);

        assertEquals(1, page.getTotalElements());
        assertEquals(acknowledgedStatus, page.getContent().getFirst().getStatus());
    }

    @Test
    void getEntityAlertsPrioritizesHighestSeverityBeforeRecency() {
        EntityMonitorBind bind = EntityMonitorBind.builder()
                .entityId(44L)
                .monitorId(404L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(44L)).thenReturn(List.of(bind));

        Monitor monitor = Monitor.builder()
                .id(404L)
                .name("checkout-api")
                .app("springboot3")
                .instance("checkout.default.svc.cluster.local")
                .status(CommonConstants.MONITOR_DOWN_CODE)
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(404L))).thenReturn(List.of(monitor));

        SingleAlert warningAlert = SingleAlert.builder()
                .id(611L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .labels(Map.of("severity", "warning"))
                .content("checkout-api latency warning")
                .gmtUpdate(LocalDateTime.of(2026, 3, 19, 10, 5))
                .build();
        SingleAlert criticalAlert = SingleAlert.builder()
                .id(612L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .labels(Map.of("severity", "critical"))
                .content("checkout-api latency critical")
                .gmtUpdate(LocalDateTime.of(2026, 3, 19, 10, 0))
                .build();
        when(singleAlertDao.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(warningAlert, criticalAlert));

        var page = observeEntityService.getEntityAlerts(44L, null, null, 0, 10);

        assertEquals(2, page.getTotalElements());
        assertEquals(612L, page.getContent().getFirst().getId());
    }

    @Test
    void getEntityMonitorsFiltersByStatusAndApp() {
        EntityMonitorBind first = EntityMonitorBind.builder()
                .entityId(51L)
                .monitorId(601L)
                .build();
        EntityMonitorBind second = EntityMonitorBind.builder()
                .entityId(51L)
                .monitorId(602L)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(51L)).thenReturn(List.of(first, second));

        Monitor mysqlDown = Monitor.builder()
                .id(601L)
                .name("order-db")
                .app("mysql")
                .status(CommonConstants.MONITOR_DOWN_CODE)
                .gmtUpdate(LocalDateTime.of(2026, 3, 19, 8, 40))
                .build();
        Monitor redisUp = Monitor.builder()
                .id(602L)
                .name("cart-cache")
                .app("redis")
                .status(CommonConstants.MONITOR_UP_CODE)
                .gmtUpdate(LocalDateTime.of(2026, 3, 19, 8, 30))
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(601L, 602L))).thenReturn(List.of(mysqlDown, redisUp));

        var page = observeEntityService.getEntityMonitors(51L, CommonConstants.MONITOR_DOWN_CODE, "mysql", 0, 10);

        assertEquals(1, page.getTotalElements());
        assertEquals(1, page.getContent().size());
        assertEquals(601L, page.getContent().getFirst().getId());
        assertEquals("mysql", page.getContent().getFirst().getApp());
    }

    @Test
    void getEntityMonitorsPrioritizesDownMonitorsBeforeHealthyOnes() {
        EntityMonitorBind first = EntityMonitorBind.builder()
                .entityId(53L)
                .monitorId(611L)
                .build();
        EntityMonitorBind second = EntityMonitorBind.builder()
                .entityId(53L)
                .monitorId(612L)
                .build();
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(53L)).thenReturn(List.of(first, second));

        Monitor recentHealthyMonitor = Monitor.builder()
                .id(611L)
                .name("gateway-http")
                .app("http")
                .status(CommonConstants.MONITOR_UP_CODE)
                .gmtUpdate(LocalDateTime.of(2026, 3, 19, 10, 20))
                .build();
        Monitor olderDownMonitor = Monitor.builder()
                .id(612L)
                .name("gateway-db")
                .app("mysql")
                .status(CommonConstants.MONITOR_DOWN_CODE)
                .gmtUpdate(LocalDateTime.of(2026, 3, 19, 10, 0))
                .build();
        when(monitorDao.findMonitorsByIdIn(Set.of(611L, 612L))).thenReturn(List.of(recentHealthyMonitor, olderDownMonitor));

        var page = observeEntityService.getEntityMonitors(53L, null, null, 0, 10);

        assertEquals(2, page.getTotalElements());
        assertEquals(612L, page.getContent().getFirst().getId());
        assertEquals(CommonConstants.MONITOR_DOWN_CODE, page.getContent().getFirst().getStatus());
    }

    @Test
    void getEntityMonitorsReturnsEmptyPageWhenNoMonitorsBound() {
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(52L)).thenReturn(Collections.emptyList());

        var page = observeEntityService.getEntityMonitors(52L, CommonConstants.MONITOR_DOWN_CODE, "mysql", 0, 10);

        assertEquals(0, page.getTotalElements());
        assertTrue(page.getContent().isEmpty());
        assertEquals(10, page.getSize());
    }

    @Test
    void getDefinitionActivitiesReturnsCatalogLevelRecentRows() {
        EntityDefinitionActivity activity = EntityDefinitionActivity.builder()
                .id(11L)
                .entityId(9L)
                .activityType("definition_import")
                .format("yaml")
                .status("success")
                .summary("Definition imported")
                .detail("service: checkout")
                .creator("admin")
                .build();
        when(entityDefinitionActivityDao.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(activity)));

        var activities = observeEntityService.getDefinitionActivities(null, 8);

        assertEquals(1, activities.size());
        assertEquals(9L, activities.getFirst().getEntityId());
        assertEquals("definition_import", activities.getFirst().getActivityType());
        assertEquals("yaml", activities.getFirst().getFormat());
    }

    @Test
    void getDefinitionActivitiesUsesRequestWorkspaceForCatalogLevelRows() {
        EntityDefinitionActivity activity = EntityDefinitionActivity.builder()
                .id(12L)
                .entityId(10L)
                .workspaceId("team-a")
                .activityType("definition_update")
                .format("yaml")
                .status("success")
                .summary("Definition updated")
                .detail("service: checkout")
                .creator("admin")
                .build();
        PageRequest pageRequest = PageRequest.of(0, 8, Sort.by(Sort.Order.desc("gmtCreate"), Sort.Order.desc("id")));
        when(entityDefinitionActivityDao.findAllByWorkspaceId("team-a", pageRequest)).thenReturn(List.of(activity));

        AuthTokenRequestContext.bindWorkspaceId("team-a");

        var activities = observeEntityService.getDefinitionActivities(null, 8);

        assertEquals(1, activities.size());
        assertEquals(10L, activities.getFirst().getEntityId());
        assertEquals("definition_update", activities.getFirst().getActivityType());
        verify(entityDefinitionActivityDao, times(0)).findAll(any(Pageable.class));
    }

    @Test
    void getCatalogSuggestionsAggregatesOwnersSystemsAndReferences() {
        ObserveEntity checkoutApi = ObserveEntity.builder()
                .id(21L)
                .type("service")
                .name("checkout-api")
                .namespace("commerce")
                .environment("prod")
                .owner("payments-team")
                .additionalOwners(List.of(
                        new EntityOwnerRef("checkout-oncall", "team")
                ))
                .system("commerce-platform")
                .lifecycle("production")
                .tier("tier1")
                .inheritFrom("service:platform/base-service")
                .languages(List.of("java", "kotlin"))
                .links(List.of(new EntityCatalogLink("Repository", "repository", "github", "https://github.com/acme/checkout")))
                .build();
        ObserveEntity orderDb = ObserveEntity.builder()
                .id(22L)
                .type("database")
                .name("order-db")
                .namespace("data")
                .environment("prod")
                .owner("data-platform")
                .system("commerce-platform")
                .lifecycle("production")
                .tier("tier1")
                .inheritFrom("datastore:platform/base-database")
                .languages(List.of("sql"))
                .links(List.of(new EntityCatalogLink("Runbook", "runbook", "runbook", "https://wiki/runbooks/order-db")))
                .build();
        when(observeEntityDao.findAll(any(Sort.class))).thenReturn(List.of(checkoutApi, orderDb));

        EntityCatalogSuggestionsInfo suggestions = observeEntityService.getCatalogSuggestions(12);

        assertTrue(suggestions.getOwners().contains("payments-team"));
        assertTrue(suggestions.getOwners().contains("checkout-oncall"));
        assertTrue(suggestions.getSystems().contains("commerce-platform"));
        assertTrue(suggestions.getNamespaces().contains("commerce"));
        assertTrue(suggestions.getEnvironments().contains("prod"));
        assertTrue(suggestions.getInheritFromRefs().contains("service:platform/base-service"));
        assertTrue(suggestions.getEntityRefs().contains("service:commerce/checkout-api"));
        assertTrue(suggestions.getEntityRefs().contains("datastore:data/order-db"));
        assertTrue(suggestions.getLanguages().contains("java"));
        assertTrue(suggestions.getLinkProviders().contains("github"));
    }

    @Test
    void getCatalogSuggestionsUseRequestWorkspaceBoundary() {
        ObserveEntity teamAlphaService = ObserveEntity.builder()
                .id(23L)
                .type("service")
                .name("checkout-api")
                .namespace("commerce")
                .environment("prod")
                .owner("team-a-owner")
                .additionalOwners(List.of(new EntityOwnerRef("team-a-oncall", "team")))
                .system("team-a-system")
                .lifecycle("production")
                .tier("tier1")
                .inheritFrom("service:commerce/base-service")
                .languages(List.of("java"))
                .links(List.of(new EntityCatalogLink("Repository", "repository", "github", "https://github.com/acme/checkout")))
                .workspaceId("team-a")
                .build();
        when(observeEntityDao.findAllByWorkspaceId("team-a", Sort.by(Sort.Order.desc("gmtUpdate"), Sort.Order.desc("id"))))
                .thenReturn(List.of(teamAlphaService));

        AuthTokenRequestContext.bindWorkspaceId("team-a");

        EntityCatalogSuggestionsInfo suggestions = observeEntityService.getCatalogSuggestions(12);

        assertEquals(List.of("team-a-owner", "team-a-oncall"), suggestions.getOwners());
        assertEquals(List.of("commerce"), suggestions.getNamespaces());
        assertEquals(List.of("team-a-system"), suggestions.getSystems());
        assertEquals(List.of("service:commerce/base-service"), suggestions.getInheritFromRefs());
        assertEquals(List.of("service:commerce/checkout-api"), suggestions.getEntityRefs());
        assertEquals(List.of("java"), suggestions.getLanguages());
        assertEquals(List.of("github"), suggestions.getLinkProviders());
        verify(observeEntityDao, times(0)).findAll(any(Sort.class));
    }

    @Test
    void parseEntityDefinitionRejectsBundleOnSingleDocumentApi() {
        EntityDefinitionRequest definitionRequest = new EntityDefinitionRequest();
        definitionRequest.setFormat("yaml");
        definitionRequest.setContent("""
                apiVersion: hertzbeat/v1
                kind: system
                metadata:
                  name: commerce-platform
                  namespace: commerce
                ---
                apiVersion: hertzbeat/v1
                kind: service
                metadata:
                  name: checkout
                  namespace: commerce
                """);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> observeEntityService.parseEntityDefinition(definitionRequest, null));

        assertEquals("Entity definition bundle contains multiple entities. Use the bundle API.", exception.getMessage());
    }

    @Test
    void parseEntityDefinitionBundleSupportsMultipleYamlDocuments() {
        EntityDefinitionRequest definitionRequest = new EntityDefinitionRequest();
        definitionRequest.setFormat("yaml");
        definitionRequest.setContent("""
                apiVersion: hertzbeat/v1
                kind: system
                metadata:
                  name: commerce-platform
                  namespace: commerce
                spec:
                  type: business-capability
                ---
                apiVersion: hertzbeat/v1
                kind: api
                metadata:
                  name: checkout-public
                  namespace: commerce
                spec:
                  type: public-api
                  ownedBy: team-commerce
                  dependsOn:
                    - service:commerce/checkout
                """);

        List<EntityDto> entityDtos = observeEntityService.parseEntityDefinitionBundle(definitionRequest);

        assertEquals(2, entityDtos.size());
        assertEquals("system", entityDtos.get(0).getEntity().getType());
        assertEquals("api", entityDtos.get(1).getEntity().getType());
        assertEquals("public-api", entityDtos.get(1).getEntity().getSubtype());
        assertEquals("service:commerce/checkout", entityDtos.get(1).getRelations().getFirst().getTargetRef());
    }

    @Test
    void addEntityByDefinitionRecordsDefinitionImportActivity() {
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EntityDefinitionRequest definitionRequest = new EntityDefinitionRequest();
        definitionRequest.setFormat("yaml");
        definitionRequest.setContent("""
                apiVersion: hertzbeat/v1
                kind: queue
                metadata:
                  name: checkout-events
                  namespace: commerce
                spec:
                  source: manual
                """);

        long entityId = observeEntityService.addEntityByDefinition(definitionRequest);

        assertTrue(entityId > 0);
        ArgumentCaptor<EntityDefinitionActivity> activityCaptor = ArgumentCaptor.forClass(EntityDefinitionActivity.class);
        verify(entityDefinitionActivityDao).saveAndFlush(activityCaptor.capture());
        EntityDefinitionActivity activity = activityCaptor.getValue();
        assertEquals(entityId, activity.getEntityId());
        assertEquals("default", activity.getWorkspaceId());
        assertEquals("definition_import", activity.getActivityType());
        assertEquals("yaml", activity.getFormat());
        assertEquals("success", activity.getStatus());
    }

    @Test
    void addEntityByDefinitionRecordsRequestWorkspaceOnActivity() {
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EntityDefinitionRequest definitionRequest = new EntityDefinitionRequest();
        definitionRequest.setFormat("yaml");
        definitionRequest.setContent("""
                apiVersion: hertzbeat/v1
                kind: service
                metadata:
                  name: checkout-api
                  namespace: commerce
                """);

        AuthTokenRequestContext.bindWorkspaceId("team-a");

        observeEntityService.addEntityByDefinition(definitionRequest);

        ArgumentCaptor<EntityDefinitionActivity> activityCaptor = ArgumentCaptor.forClass(EntityDefinitionActivity.class);
        verify(entityDefinitionActivityDao).saveAndFlush(activityCaptor.capture());
        assertEquals("team-a", activityCaptor.getValue().getWorkspaceId());
    }

    @Test
    void addEntitiesByDefinitionBundleResolvesInternalTargetRefs() {
        Map<String, ObserveEntity> savedEntities = new HashMap<>();
        when(observeEntityDao.saveAll(any())).thenAnswer(invocation -> {
            List<ObserveEntity> entities = invocation.getArgument(0);
            entities.forEach(entity -> savedEntities.put(entity.getType() + "|" + entity.getNamespace() + "|" + entity.getName(), entity));
            return entities;
        });
        when(observeEntityDao.findFirstByTypeAndNamespaceAndName(any(String.class), any(String.class), any(String.class)))
                .thenAnswer(invocation -> Optional.ofNullable(
                        savedEntities.get(invocation.getArgument(0) + "|" + invocation.getArgument(1) + "|" + invocation.getArgument(2))
                ));
        when(observeEntityDao.findFirstByTypeAndName(any(String.class), any(String.class)))
                .thenAnswer(invocation -> savedEntities.values().stream()
                        .filter(entity -> invocation.getArgument(0).equals(entity.getType())
                                && invocation.getArgument(1).equals(entity.getName()))
                        .findFirst());
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(anyLong())).thenReturn(Collections.emptyList());

        EntityDefinitionRequest definitionRequest = new EntityDefinitionRequest();
        definitionRequest.setFormat("yaml");
        definitionRequest.setContent("""
                apiVersion: hertzbeat/v1
                kind: service
                metadata:
                  name: checkout
                  namespace: commerce
                spec:
                  type: web-service
                ---
                apiVersion: hertzbeat/v1
                kind: api
                metadata:
                  name: checkout-public
                  namespace: commerce
                spec:
                  type: public-api
                  dependsOn:
                    - service:commerce/checkout
                """);

        List<Long> entityIds = observeEntityService.addEntitiesByDefinitionBundle(definitionRequest);

        assertEquals(2, entityIds.size());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<EntityRelation>> relationCaptor = ArgumentCaptor.forClass((Class) List.class);
        verify(entityRelationDao, times(1)).saveAll(relationCaptor.capture());
        List<EntityRelation> relations = relationCaptor.getValue();
        assertEquals(1, relations.size());
        EntityRelation relation = relations.getFirst();
        assertEquals("depends_on", relation.getRelationType());
        assertTrue(entityIds.contains(relation.getSourceEntityId()));
        assertTrue(entityIds.contains(relation.getTargetEntityId()));
        assertNotEquals(relation.getSourceEntityId(), relation.getTargetEntityId());
        assertEquals("service:commerce/checkout", relation.getTargetRef());
    }

    @Test
    void modifyEntityFlushIdentityDeleteBeforeSaveAndDedupesRows() {
        ObserveEntity storedEntity = ObserveEntity.builder()
                .id(1L)
                .type("service")
                .name("payment-service")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(1L)).thenReturn(Optional.of(storedEntity));
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(1L)).thenReturn(Collections.emptyList());

        EntityIdentity primaryIdentity = EntityIdentity.builder()
                .entityId(1L)
                .identityType("derived")
                .identityKey("service.name")
                .identityValue("Payment Service")
                .priority(90)
                .primaryIdentity(true)
                .build();
        EntityIdentity duplicateIdentity = EntityIdentity.builder()
                .entityId(1L)
                .identityType("derived")
                .identityKey("service.name")
                .identityValue(" Payment Service ")
                .priority(80)
                .primaryIdentity(false)
                .build();

        EntityDto entityDto = new EntityDto();
        entityDto.setEntity(storedEntity);
        entityDto.setIdentities(List.of(primaryIdentity, duplicateIdentity));
        entityDto.setMonitorBinds(Collections.emptyList());
        entityDto.setRelations(Collections.emptyList());

        observeEntityService.modifyEntity(entityDto);

        InOrder inOrder = inOrder(entityIdentityDao);
        inOrder.verify(entityIdentityDao).deleteAllByEntityId(1L);
        inOrder.verify(entityIdentityDao).flush();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<EntityIdentity>> identitiesCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityIdentityDao).saveAll(identitiesCaptor.capture());
        List<EntityIdentity> savedRows = identitiesCaptor.getValue();
        assertEquals(1, savedRows.size());
        assertEquals("service.name", savedRows.getFirst().getIdentityKey());
        assertEquals("payment-service", savedRows.getFirst().getIdentityValue());
        assertEquals("payment-service", savedRows.getFirst().getNormalizedValue());
    }

    @Test
    void modifyAndDeleteEntityRejectDifferentRequestWorkspaceBeforeSideEffects() {
        ObserveEntity teamBetaEntity = ObserveEntity.builder()
                .id(81L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .source("manual")
                .workspaceId("team-b")
                .build();
        when(observeEntityDao.findById(81L)).thenReturn(Optional.of(teamBetaEntity));
        lenient().when(observeEntityDao.existsById(81L)).thenReturn(true);
        lenient().when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(81L)).thenReturn(Collections.emptyList());

        ObserveEntity update = ObserveEntity.builder()
                .id(81L)
                .type("service")
                .name("checkout-api-renamed")
                .status("unknown")
                .source("manual")
                .workspaceId("team-b")
                .build();
        EntityDto entityDto = new EntityDto();
        entityDto.setEntity(update);
        entityDto.setIdentities(Collections.emptyList());
        entityDto.setMonitorBinds(Collections.emptyList());
        entityDto.setRelations(Collections.emptyList());

        AuthTokenRequestContext.bindWorkspaceId("team-a");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> observeEntityService.modifyEntity(entityDto));
        assertEquals("Entity not exist.", exception.getMessage());
        observeEntityService.deleteEntity(81L);

        verify(observeEntityDao, times(0)).save(any(ObserveEntity.class));
        verify(entityIdentityDao, times(0)).deleteAllByEntityId(81L);
        verify(entityMonitorBindDao, times(0)).deleteAllByEntityId(81L);
        verify(entityRelationDao, times(0)).deleteAllBySourceEntityIdOrTargetEntityId(81L, 81L);
        verify(observeEntityDao, times(0)).deleteById(81L);
    }

    @Test
    void modifyEntityByDefinitionRejectsDifferentRequestWorkspaceWithoutActivity() {
        ObserveEntity teamBetaEntity = ObserveEntity.builder()
                .id(82L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .source("manual")
                .workspaceId("team-b")
                .build();
        when(observeEntityDao.findById(82L)).thenReturn(Optional.of(teamBetaEntity));
        EntityDefinitionRequest definitionRequest = new EntityDefinitionRequest();
        definitionRequest.setFormat("yaml");
        definitionRequest.setContent("""
                kind: service
                metadata:
                  name: checkout-api
                spec:
                  type: service
                """);

        AuthTokenRequestContext.bindWorkspaceId("team-a");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> observeEntityService.modifyEntityByDefinition(82L, definitionRequest));
        assertEquals("Entity not exist.", exception.getMessage());
        verify(observeEntityDao, times(0)).save(any(ObserveEntity.class));
        verify(entityDefinitionActivityDao, times(0)).saveAndFlush(any(EntityDefinitionActivity.class));
    }

    @Test
    void modifyEntityByDefinitionRecordsDefinitionUpdateActivity() {
        ObserveEntity storedEntity = ObserveEntity.builder()
                .id(11L)
                .type("service")
                .name("checkout")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(11L)).thenReturn(Optional.of(storedEntity));
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(11L)).thenReturn(Collections.emptyList());

        EntityDefinitionRequest definitionRequest = new EntityDefinitionRequest();
        definitionRequest.setFormat("json");
        definitionRequest.setContent("""
                {
                  "apiVersion": "hertzbeat/v1",
                  "kind": "service",
                  "metadata": {
                    "name": "checkout",
                    "namespace": "commerce"
                  },
                  "spec": {
                    "source": "manual",
                    "tier": "tier1"
                  }
                }
                """);

        observeEntityService.modifyEntityByDefinition(11L, definitionRequest);

        ArgumentCaptor<EntityDefinitionActivity> activityCaptor = ArgumentCaptor.forClass(EntityDefinitionActivity.class);
        verify(entityDefinitionActivityDao).saveAndFlush(activityCaptor.capture());
        EntityDefinitionActivity activity = activityCaptor.getValue();
        assertEquals(11L, activity.getEntityId());
        assertEquals("definition_update", activity.getActivityType());
        assertEquals("json", activity.getFormat());
        assertEquals("success", activity.getStatus());
    }

    @Test
    void modifyEntityByDefinitionFailureRecordsDefinitionActivityError() {
        EntityDefinitionRequest definitionRequest = new EntityDefinitionRequest();
        definitionRequest.setFormat("yaml");
        definitionRequest.setContent("""
                apiVersion: hertzbeat/v1
                kind: service
                metadata:
                  name:
                """);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> observeEntityService.modifyEntityByDefinition(12L, definitionRequest));

        assertTrue(exception.getMessage().contains("Entity name can not be blank"));
        ArgumentCaptor<EntityDefinitionActivity> activityCaptor = ArgumentCaptor.forClass(EntityDefinitionActivity.class);
        verify(entityDefinitionActivityDao).saveAndFlush(activityCaptor.capture());
        EntityDefinitionActivity activity = activityCaptor.getValue();
        assertEquals(12L, activity.getEntityId());
        assertEquals("definition_update", activity.getActivityType());
        assertEquals("yaml", activity.getFormat());
        assertEquals("error", activity.getStatus());
        assertEquals("Definition update failed", activity.getSummary());
    }

    @Test
    void getEntitiesIncludesLatestDefinitionActivitySummary() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(21L)
                .type("service")
                .name("catalog-lifecycle")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));
        when(entityIdentityDao.countByEntityId(21L)).thenReturn(0L);
        when(entityRelationDao.countBySourceEntityIdOrTargetEntityId(21L, 21L)).thenReturn(0L);
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(21L)).thenReturn(Collections.emptyList());
        EntityDefinitionActivity latestActivity = EntityDefinitionActivity.builder()
                .id(101L)
                .entityId(21L)
                .activityType("definition_update")
                .format("yaml")
                .status("success")
                .summary("Definition updated")
                .build();
        when(entityDefinitionActivityDao.findAllByEntityIdIn(any(), any(Sort.class))).thenReturn(List.of(latestActivity));

        var page = observeEntityService.getEntities(null, null, null, null, null, null,
                null, null, null, null, "gmtUpdate", "desc", 0, 8);

        assertEquals(1, page.getContent().size());
        EntitySummaryInfo summary = page.getContent().getFirst();
        assertTrue(summary.isDefinitionManaged());
        assertEquals("success", summary.getDefinitionActivityStatus());
        assertEquals("Definition updated", summary.getDefinitionActivitySummary());
        assertEquals("yaml", summary.getDefinitionActivityFormat());
    }

    @Test
    void getEntitiesIncludesOpsSummaryAndNextAction() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(23L)
                .type("service")
                .name("entity-phase-two")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));
        when(entityIdentityDao.countByEntityId(23L)).thenReturn(0L);
        when(entityRelationDao.countBySourceEntityIdOrTargetEntityId(23L, 23L)).thenReturn(0L);
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(23L)).thenReturn(Collections.emptyList());
        when(entityDefinitionActivityDao.findAllByEntityIdIn(any(), any(Sort.class))).thenReturn(Collections.emptyList());

        var page = observeEntityService.getEntities(null, null, null, null, null, null,
                null, null, null, null, "gmtUpdate", "desc", 0, 8);

        assertEquals(1, page.getContent().size());
        EntitySummaryInfo summary = page.getContent().getFirst();
        assertFalse(summary.getOpsSummary().isOwnerReady());
        assertFalse(summary.getOpsSummary().isRunbookReady());
        assertFalse(summary.getOpsSummary().isTelemetryReady());
        assertEquals("complete_owner", summary.getNextAction().getActionType());
        assertEquals(0, summary.getOpsSummary().getReadinessScore());
    }

    @Test
    void getEntitiesFiltersByRequestWorkspace() {
        ObserveEntity teamAlpha = ObserveEntity.builder()
                .id(31L)
                .type("service")
                .name("checkout")
                .status("unknown")
                .source("manual")
                .workspaceId("team-a")
                .build();
        ObserveEntity teamBeta = ObserveEntity.builder()
                .id(32L)
                .type("service")
                .name("payments")
                .status("unknown")
                .source("manual")
                .workspaceId("team-b")
                .build();
        when(observeEntityDao.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(teamAlpha, teamBeta)));
        when(entityIdentityDao.countByEntityId(anyLong())).thenReturn(0L);
        when(entityRelationDao.countBySourceEntityIdOrTargetEntityId(anyLong(), anyLong())).thenReturn(0L);
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(anyLong())).thenReturn(Collections.emptyList());
        when(entityDefinitionActivityDao.findAllByEntityIdIn(any(), any(Sort.class))).thenReturn(Collections.emptyList());
        AuthTokenRequestContext.bindWorkspaceId("team-a");

        var page = observeEntityService.getEntities(null, null, null, null, null, null,
                null, null, null, null, "gmtUpdate", "desc", 0, 8);

        assertEquals(1, page.getContent().size());
        assertEquals(1, page.getTotalElements());
        assertEquals(31L, page.getContent().getFirst().getEntity().getId());
        assertEquals("team-a", page.getContent().getFirst().getEntity().getWorkspaceId());
    }

    @Test
    void getEntitiesIgnoresNonDefinitionActivitiesForDefinitionSummary() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(22L)
                .type("service")
                .name("catalog-lifecycle")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));
        when(entityIdentityDao.countByEntityId(22L)).thenReturn(0L);
        when(entityRelationDao.countBySourceEntityIdOrTargetEntityId(22L, 22L)).thenReturn(0L);
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(22L)).thenReturn(Collections.emptyList());
        EntityDefinitionActivity discoveryActivity = EntityDefinitionActivity.builder()
                .id(202L)
                .entityId(22L)
                .activityType("discovery_governance")
                .status("success")
                .summary("Telemetry discovery applied")
                .build();
        EntityDefinitionActivity definitionActivity = EntityDefinitionActivity.builder()
                .id(201L)
                .entityId(22L)
                .activityType("definition_update")
                .format("yaml")
                .status("success")
                .summary("Definition updated")
                .build();
        when(entityDefinitionActivityDao.findAllByEntityIdIn(any(), any(Sort.class)))
                .thenReturn(List.of(discoveryActivity, definitionActivity));

        var page = observeEntityService.getEntities(null, null, null, null, null, null,
                null, null, null, null, "gmtUpdate", "desc", 0, 8);

        assertEquals(1, page.getContent().size());
        EntitySummaryInfo summary = page.getContent().getFirst();
        assertTrue(summary.isDefinitionManaged());
        assertEquals("Definition updated", summary.getDefinitionActivitySummary());
        assertEquals("yaml", summary.getDefinitionActivityFormat());
    }

    @Test
    void addEntityRecordsCatalogCreateLifecycleActivity() {
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityIdentityDao.saveAll(any(List.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(anyLong())).thenReturn(Collections.emptyList());

        EntityInfo entityInfo = new EntityInfo();
        entityInfo.setType("service");
        entityInfo.setName("catalog-created");
        entityInfo.setOwner("catalog-oncall");
        entityInfo.setSystem("commerce-platform");

        EntityDto entityDto = new EntityDto();
        entityDto.setEntityInfo(entityInfo);
        entityDto.setIdentities(Collections.emptyList());
        entityDto.setMonitorBinds(Collections.emptyList());
        entityDto.setRelations(Collections.emptyList());

        long entityId = observeEntityService.addEntity(entityDto);

        ArgumentCaptor<EntityDefinitionActivity> activityCaptor = ArgumentCaptor.forClass(EntityDefinitionActivity.class);
        verify(entityDefinitionActivityDao).saveAndFlush(activityCaptor.capture());
        EntityDefinitionActivity activity = activityCaptor.getValue();
        assertEquals(entityId, activity.getEntityId());
        assertEquals("catalog_create", activity.getActivityType());
        assertEquals("success", activity.getStatus());
        assertEquals("Catalog entity created", activity.getSummary());
        assertEquals("yaml", activity.getFormat());
    }

    @Test
    void modifyEntityRecordsDiscoveryLifecycleActivityWhenTelemetryBindAdded() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(31L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(31L)).thenReturn(Optional.of(entity));
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityIdentityDao.saveAll(any(List.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(31L)).thenReturn(Collections.emptyList());

        EntityInfo entityInfo = new EntityInfo();
        entityInfo.setId(31L);
        entityInfo.setType("service");
        entityInfo.setName("checkout-api");
        entityInfo.setSource("manual");

        EntityMonitorBind bind = new EntityMonitorBind();
        bind.setMonitorId(301L);
        bind.setBindSource("telemetry_discovery");
        bind.setBindType("candidate");
        bind.setStatus("active");

        EntityDto entityDto = new EntityDto();
        entityDto.setEntityInfo(entityInfo);
        entityDto.setIdentities(Collections.emptyList());
        entityDto.setMonitorBinds(List.of(bind));
        entityDto.setRelations(Collections.emptyList());

        observeEntityService.modifyEntity(entityDto);

        ArgumentCaptor<EntityDefinitionActivity> activityCaptor = ArgumentCaptor.forClass(EntityDefinitionActivity.class);
        verify(entityDefinitionActivityDao).saveAndFlush(activityCaptor.capture());
        EntityDefinitionActivity activity = activityCaptor.getValue();
        assertEquals(31L, activity.getEntityId());
        assertEquals("discovery_governance", activity.getActivityType());
        assertEquals("success", activity.getStatus());
        assertEquals("Telemetry discovery applied", activity.getSummary());
    }

    @Test
    void addEntityBuildsPrimaryIdentityFromNameInsteadOfDisplayName() {
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityIdentityDao.saveAll(any(List.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(anyLong())).thenReturn(Collections.emptyList());

        EntityInfo entityInfo = new EntityInfo();
        entityInfo.setType("service");
        entityInfo.setName("checkout-api");
        entityInfo.setDisplayName("Checkout API");
        entityInfo.setNamespace("commerce");
        entityInfo.setEnvironment("prod");

        EntityDto entityDto = new EntityDto();
        entityDto.setEntityInfo(entityInfo);
        entityDto.setIdentities(Collections.emptyList());
        entityDto.setMonitorBinds(Collections.emptyList());
        entityDto.setRelations(Collections.emptyList());

        observeEntityService.addEntity(entityDto);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<EntityIdentity>> identitiesCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityIdentityDao).saveAll(identitiesCaptor.capture());
        List<EntityIdentity> savedRows = identitiesCaptor.getValue();
        assertEquals(3, savedRows.size());
        EntityIdentity primaryIdentity = savedRows.stream()
                .filter(EntityIdentity::isPrimaryIdentity)
                .findFirst()
                .orElseThrow();

        assertEquals("service.name", primaryIdentity.getIdentityKey());
        assertEquals("checkout-api", primaryIdentity.getIdentityValue());
        assertEquals("checkout-api", primaryIdentity.getNormalizedValue());
        assertEquals(primaryIdentity.getEntityId(), savedRows.get(1).getEntityId());
        assertEquals(primaryIdentity.getEntityId(), savedRows.get(2).getEntityId());
    }

    @Test
    void addQueueEntityBuildsMessagingDestinationPrimaryIdentity() {
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityIdentityDao.saveAll(any(List.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(anyLong())).thenReturn(Collections.emptyList());

        EntityInfo entityInfo = new EntityInfo();
        entityInfo.setType("queue");
        entityInfo.setName("orders-events");
        entityInfo.setDisplayName("Orders Events Queue");
        entityInfo.setEnvironment("prod");

        EntityDto entityDto = new EntityDto();
        entityDto.setEntityInfo(entityInfo);
        entityDto.setIdentities(Collections.emptyList());
        entityDto.setMonitorBinds(Collections.emptyList());
        entityDto.setRelations(Collections.emptyList());

        observeEntityService.addEntity(entityDto);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<EntityIdentity>> identitiesCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityIdentityDao).saveAll(identitiesCaptor.capture());
        List<EntityIdentity> savedRows = identitiesCaptor.getValue();
        EntityIdentity primaryIdentity = savedRows.stream()
                .filter(EntityIdentity::isPrimaryIdentity)
                .findFirst()
                .orElseThrow();

        assertEquals("messaging.destination.name", primaryIdentity.getIdentityKey());
        assertEquals("orders-events", primaryIdentity.getIdentityValue());
        assertEquals("orders-events", primaryIdentity.getNormalizedValue());
    }

    @Test
    void addEntityPersistsCatalogMetadataFields() {
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityIdentityDao.saveAll(any(List.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(anyLong())).thenReturn(Collections.emptyList());

        EntityInfo entityInfo = new EntityInfo();
        entityInfo.setType("service");
        entityInfo.setName("catalog-metadata");
        entityInfo.setSubtype("web-service");
        entityInfo.setEnvironment("prod");
        entityInfo.setLifecycle("production");
        entityInfo.setTier("tier1");
        entityInfo.setSystem("commerce-platform");
        entityInfo.setLinks(List.of(new EntityCatalogLink("repository", "repository", "https://git.local/catalog")));
        entityInfo.setContacts(List.of(new EntityCatalogContact("primary-email", "email", "catalog@example.com")));
        entityInfo.setIntegrations(JsonUtil.fromJson("""
                {"pagerduty":{"serviceURL":"https://www.pagerduty.com/service-directory/Pcatalog"}}
                """));
        entityInfo.setExtensions(JsonUtil.fromJson("""
                {"hertzbeat.apache.org/catalog":{"customField":"customValue"}}
                """));
        entityInfo.setHertzbeat(JsonUtil.fromJson("""
                {
                  "codeLocations": [
                    {
                      "repositoryURL": "https://github.com/acme/catalog.git",
                      "paths": ["services/catalog/**"]
                    }
                  ],
                  "logs": [
                    {
                      "name": "critical logs",
                      "query": "service:catalog status:error"
                    }
                  ]
                }
                """));

        EntityDto entityDto = new EntityDto();
        entityDto.setEntityInfo(entityInfo);
        entityDto.setIdentities(Collections.emptyList());
        entityDto.setMonitorBinds(Collections.emptyList());
        entityDto.setRelations(Collections.emptyList());

        observeEntityService.addEntity(entityDto);

        ArgumentCaptor<ObserveEntity> entityCaptor = ArgumentCaptor.forClass(ObserveEntity.class);
        verify(observeEntityDao).save(entityCaptor.capture());
        ObserveEntity saved = entityCaptor.getValue();
        assertEquals("web-service", saved.getSubtype());
        assertEquals("production", saved.getLifecycle());
        assertEquals("tier1", saved.getTier());
        assertEquals("commerce-platform", saved.getSystem());
        assertEquals(1, saved.getLinks().size());
        assertEquals("repository", saved.getLinks().getFirst().getType());
        assertEquals(1, saved.getContacts().size());
        assertEquals("catalog@example.com", saved.getContacts().getFirst().getValue());
        assertEquals("https://www.pagerduty.com/service-directory/Pcatalog",
                saved.getIntegrations().get("pagerduty").get("serviceURL").asText());
        assertEquals("customValue", saved.getExtensions().get("hertzbeat.apache.org/catalog").get("customField").asText());
        assertEquals("https://github.com/acme/catalog.git",
                saved.getHertzbeat().get("codeLocations").get(0).get("repositoryURL").asText());
    }

    @Test
    void modifyEntityPersistsCatalogMetadataFields() {
        ObserveEntity storedEntity = ObserveEntity.builder()
                .id(1L)
                .type("service")
                .name("payment-service")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(1L)).thenReturn(Optional.of(storedEntity));
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(1L)).thenReturn(Collections.emptyList());

        EntityInfo entityInfo = EntityInfo.fromEntity(storedEntity);
        entityInfo.setSubtype("worker-service");
        entityInfo.setLifecycle("production");
        entityInfo.setTier("tier0");
        entityInfo.setSystem("payments");
        entityInfo.setLinks(List.of(new EntityCatalogLink("dashboard", "dashboard", "https://dash.local/payment")));
        entityInfo.setContacts(List.of(new EntityCatalogContact("slack", "slack", "#payments-oncall")));

        EntityDto entityDto = new EntityDto();
        entityDto.setEntityInfo(entityInfo);
        entityDto.setIdentities(Collections.emptyList());
        entityDto.setMonitorBinds(Collections.emptyList());
        entityDto.setRelations(Collections.emptyList());

        observeEntityService.modifyEntity(entityDto);

        assertEquals("worker-service", storedEntity.getSubtype());
        assertEquals("production", storedEntity.getLifecycle());
        assertEquals("tier0", storedEntity.getTier());
        assertEquals("payments", storedEntity.getSystem());
        assertEquals(1, storedEntity.getLinks().size());
        assertEquals("dashboard", storedEntity.getLinks().getFirst().getType());
        assertEquals(1, storedEntity.getContacts().size());
        assertEquals("#payments-oncall", storedEntity.getContacts().getFirst().getValue());
    }

    @Test
    void modifyEntityCanonicalizesDerivedServiceNameFromEntityName() {
        ObserveEntity storedEntity = ObserveEntity.builder()
                .id(1L)
                .type("service")
                .name("payment-service")
                .displayName("Payment Service")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(1L)).thenReturn(Optional.of(storedEntity));
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(1L)).thenReturn(Collections.emptyList());

        EntityInfo entityInfo = EntityInfo.fromEntity(storedEntity);
        entityInfo.setName("checkout-api");
        entityInfo.setDisplayName("Checkout API");

        EntityIdentity identity = EntityIdentity.builder()
                .entityId(1L)
                .identityType("derived")
                .identityKey("service.name")
                .identityValue("Checkout API")
                .priority(90)
                .primaryIdentity(true)
                .build();

        EntityDto entityDto = new EntityDto();
        entityDto.setEntityInfo(entityInfo);
        entityDto.setIdentities(List.of(identity));
        entityDto.setMonitorBinds(Collections.emptyList());
        entityDto.setRelations(Collections.emptyList());

        observeEntityService.modifyEntity(entityDto);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<EntityIdentity>> identitiesCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityIdentityDao).saveAll(identitiesCaptor.capture());
        List<EntityIdentity> savedRows = identitiesCaptor.getValue();
        assertEquals(1, savedRows.size());
        assertEquals("service.name", savedRows.getFirst().getIdentityKey());
        assertEquals("checkout-api", savedRows.getFirst().getIdentityValue());
        assertEquals("checkout-api", savedRows.getFirst().getNormalizedValue());
    }

    @Test
    void parseEntityDefinitionSupportsCanonicalYaml() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("""
                apiVersion: hertzbeat/v1
                kind: service
                metadata:
                  name: checkout-api
                  namespace: commerce
                  owner: payments-oncall
                  additionalOwners:
                    - name: payments-platform
                      type: team
                  displayName: Checkout API
                  description: Checkout entry service
                  tags:
                    - team:payments
                    - system:commerce
                  links:
                    - name: dashboard
                      type: dashboard
                      url: https://dashboards.local/checkout
                  contacts:
                    - name: primary-slack
                      type: slack
                      value: '#payments-oncall'
                spec:
                  type: web-service
                  source: manual
                  environment: prod
                  criticality: high
                  lifecycle: production
                  tier: tier1
                  partOf: commerce
                  runbook: https://runbooks.local/checkout
                  dependsOn:
                    - datastore:default/order-db
                  telemetry:
                    identities:
                      - key: service.name
                        value: checkout-api
                        type: derived
                        primary: true
                    monitors:
                      - monitorId: 101
                        bindType: manual
                        bindSource: manual
                        status: active
                """);
        when(observeEntityDao.findFirstByTypeAndNamespaceAndName("database", "default", "order-db"))
                .thenReturn(Optional.of(ObserveEntity.builder().id(202L).type("database").namespace("default").name("order-db").build()));

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);

        assertEquals("service", entityDto.getEntity().getType());
        assertEquals("checkout-api", entityDto.getEntity().getName());
        assertEquals("Checkout API", entityDto.getEntity().getDisplayName());
        assertEquals("web-service", entityDto.getEntity().getSubtype());
        assertEquals("payments-oncall", entityDto.getEntity().getOwner());
        assertEquals("commerce", entityDto.getEntity().getNamespace());
        assertEquals(1, entityDto.getEntity().getAdditionalOwners().size());
        assertEquals("payments-platform", entityDto.getEntity().getAdditionalOwners().getFirst().getName());
        assertEquals("team", entityDto.getEntity().getAdditionalOwners().getFirst().getType());
        assertEquals("payments", entityDto.getEntity().getLabels().get("team"));
        assertEquals(List.of("team:payments", "system:commerce"), entityDto.getEntity().getTags());
        assertEquals("https://runbooks.local/checkout", entityDto.getEntity().getRunbook());
        assertEquals("production", entityDto.getEntity().getLifecycle());
        assertEquals("tier1", entityDto.getEntity().getTier());
        assertEquals("commerce", entityDto.getEntity().getSystem());
        assertEquals(2, entityDto.getEntity().getLinks().size());
        assertEquals(1, entityDto.getEntity().getContacts().size());
        assertEquals(1, entityDto.getIdentities().size());
        assertEquals("service.name", entityDto.getIdentities().getFirst().getIdentityKey());
        assertEquals(1, entityDto.getMonitorBinds().size());
        assertEquals(101L, entityDto.getMonitorBinds().getFirst().getMonitorId());
        assertEquals(1, entityDto.getRelations().size());
        assertEquals(202L, entityDto.getRelations().getFirst().getTargetEntityId());
    }

    @Test
    void parseSystemEntityDefinitionSupportsComponents() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("""
                apiVersion: hertzbeat/v1
                kind: system
                metadata:
                  name: commerce-platform
                  owner: commerce-oncall
                spec:
                  source: manual
                  components:
                    - service:commerce/checkout-api
                    - datastore:data/order-db
                """);

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);

        assertEquals("system", entityDto.getEntity().getType());
        assertEquals("commerce-platform", entityDto.getEntity().getName());
        assertEquals(List.of("service:commerce/checkout-api", "datastore:data/order-db"), entityDto.getEntity().getComponents());
        assertTrue(entityDto.getEntity().getComponentOf() == null || entityDto.getEntity().getComponentOf().isEmpty());
    }

    @Test
    void parseApiDefinitionKeepsPartOfAsSystemWhenComponentOfAlsoExists() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("""
                apiVersion: hertzbeat/v1
                kind: api
                metadata:
                  name: checkout-public-api
                  namespace: commerce
                spec:
                  type: public-api
                  partOf: commerce-platform
                  componentOf:
                    - system-subtype-verify-20260316
                """);

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);

        assertEquals("api", entityDto.getEntity().getType());
        assertEquals("public-api", entityDto.getEntity().getSubtype());
        assertEquals("commerce-platform", entityDto.getEntity().getSystem());
        assertEquals(List.of("system-subtype-verify-20260316"), entityDto.getEntity().getComponentOf());
    }

    @Test
    void parseApiDefinitionSupportsImplementedByAndInterface() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("""
                apiVersion: hertzbeat/v1
                kind: api
                metadata:
                  name: checkout-public-api
                  namespace: commerce
                spec:
                  type: public-api
                  partOf: commerce-platform
                  implementedBy:
                    - service:commerce/checkout-api
                    - service:commerce/edge-proxy
                  interface:
                    fileRef: https://schemas.example.com/checkout/openapi.yaml
                    definition:
                      openapi: 3.0.3
                      info:
                        title: Checkout API
                        version: 1.0.0
                """);

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);

        assertEquals("api", entityDto.getEntity().getType());
        assertEquals("public-api", entityDto.getEntity().getSubtype());
        assertEquals(List.of("service:commerce/checkout-api", "service:commerce/edge-proxy"),
                entityDto.getEntity().getImplementedBy());
        assertEquals("https://schemas.example.com/checkout/openapi.yaml",
                entityDto.getEntity().getApiInterface().get("fileRef").asText());
        assertEquals("3.0.3", entityDto.getEntity().getApiInterface().get("definition").get("openapi").asText());
    }

    @Test
    void parseLegacyComponentOfKeepsFirstEntryAsSystemOnlyWhenMultipleValuesPresent() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("""
                apiVersion: hertzbeat/v1
                kind: service
                metadata:
                  name: checkout-api
                spec:
                  componentOf:
                    - commerce-platform
                    - checkout-domain
                """);

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);

        assertEquals("commerce-platform", entityDto.getEntity().getSystem());
        assertEquals(List.of("checkout-domain"), entityDto.getEntity().getComponentOf());
    }

    @Test
    void parseLegacyServiceDefinitionV22Compatibility() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("""
                schema-version: v2.2
                dd-service: checkout-api
                team: checkout-platform
                application: commerce-platform
                description: Checkout service imported from legacy definition
                contacts:
                  - type: email
                    contact: checkout-platform@example.com
                links:
                  - name: Checkout API Runbook
                    type: runbook
                    url: https://example.com/runbooks/checkout-api
                tags:
                  - team:checkout-platform
                  - region:cn
                lifecycle: production
                tier: tier1
                type: web-service
                languages:
                  - java
                ci-pipeline-fingerprints:
                  - checkout-main
                """);

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);

        assertEquals("service", entityDto.getEntity().getType());
        assertEquals("checkout-api", entityDto.getEntity().getName());
        assertEquals("web-service", entityDto.getEntity().getSubtype());
        assertEquals("checkout-platform", entityDto.getEntity().getOwner());
        assertEquals("commerce-platform", entityDto.getEntity().getSystem());
        assertEquals("production", entityDto.getEntity().getLifecycle());
        assertEquals("tier1", entityDto.getEntity().getTier());
        assertEquals("Checkout service imported from legacy definition", entityDto.getEntity().getDescription());
        assertEquals("checkout-platform@example.com", entityDto.getEntity().getContacts().getFirst().getValue());
        assertEquals("https://example.com/runbooks/checkout-api", entityDto.getEntity().getRunbook());
        assertEquals(List.of("team:checkout-platform", "region:cn"), entityDto.getEntity().getTags());
        assertEquals(List.of("java"), entityDto.getEntity().getLanguages());
        assertEquals("checkout-main",
                entityDto.getEntity().getHertzbeat().get("pipelines").get("fingerprints").get(0).asText());
    }

    @Test
    void parseLegacyDefinitionFallsBackToSpecTypeForEntityType() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("""
                apiVersion: hertzbeat/v1
                metadata:
                  name: legacy-checkout
                spec:
                  type: service
                  environment: prod
                """);

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);

        assertEquals("service", entityDto.getEntity().getType());
        assertNull(entityDto.getEntity().getSubtype());
        assertEquals("legacy-checkout", entityDto.getEntity().getName());
    }

    @Test
    void parseEntityDefinitionKeepsUnresolvedDependsOnReference() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("""
                apiVersion: hertzbeat/v1
                kind: service
                metadata:
                  name: checkout-api
                spec:
                  dependsOn:
                    - service:commerce/payments-api
                """);
        when(observeEntityDao.findFirstByTypeAndNamespaceAndName("service", "commerce", "payments-api"))
                .thenReturn(Optional.empty());
        when(observeEntityDao.findFirstByTypeAndName("service", "payments-api"))
                .thenReturn(Optional.empty());

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);

        assertEquals(1, entityDto.getRelations().size());
        assertEquals("service:commerce/payments-api", entityDto.getRelations().getFirst().getTargetRef());
        assertEquals(null, entityDto.getRelations().getFirst().getTargetEntityId());
    }

    @Test
    void parseEntityDefinitionResolvesRelationsInsideRequestWorkspaceOnly() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("""
                apiVersion: hertzbeat/v1
                kind: service
                metadata:
                  name: checkout-api
                  namespace: commerce
                spec:
                  dependsOn:
                    - service:commerce/payments-api
                    - id: 902
                      ref: "902"
                """);
        ObserveEntity teamAlphaTarget = ObserveEntity.builder()
                .id(901L)
                .type("service")
                .namespace("commerce")
                .name("payments-api")
                .workspaceId("team-a")
                .build();
        ObserveEntity teamBetaDirectTarget = ObserveEntity.builder()
                .id(902L)
                .type("database")
                .namespace("commerce")
                .name("orders-db")
                .workspaceId("team-b")
                .build();
        when(observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                "team-a", "service", "commerce", "payments-api")).thenReturn(Optional.of(teamAlphaTarget));
        when(observeEntityDao.findById(902L)).thenReturn(Optional.of(teamBetaDirectTarget));

        AuthTokenRequestContext.bindWorkspaceId("team-a");

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);

        assertEquals(2, entityDto.getRelations().size());
        assertEquals(901L, entityDto.getRelations().get(0).getTargetEntityId());
        assertEquals("service:commerce/payments-api", entityDto.getRelations().get(0).getTargetRef());
        assertNull(entityDto.getRelations().get(1).getTargetEntityId());
        assertEquals("902", entityDto.getRelations().get(1).getTargetRef());
        verify(observeEntityDao, times(0)).findFirstByTypeAndNamespaceAndName(any(String.class), any(String.class), any(String.class));
        verify(observeEntityDao, times(0)).findFirstByTypeAndName(any(String.class), any(String.class));
    }

    @Test
    void parseEntityDefinitionSupportsHertzBeatV1Blocks() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("""
                apiVersion: hertzbeat/v1
                kind: service
                metadata:
                  name: checkout-api
                spec:
                  source: manual
                integrations:
                  pagerduty:
                    serviceURL: https://www.pagerduty.com/service-directory/Pshopping-cart
                extensions:
                  hertzbeat.apache.org/shopping-cart:
                    customField: customValue
                hertzbeat:
                  codeLocations:
                    - repositoryURL: https://github.com/myorganization/myrepo.git
                      paths:
                        - services/checkout/**
                  events:
                    - name: deployment events
                      query: app:checkout type:github
                  logs:
                    - name: critical logs
                      query: service:checkout status:error
                  performanceData:
                    tags:
                      - service:checkout-api
                      - team:payments
                  pipelines:
                    fingerprints:
                      - checkout-main
                """);

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);

        assertEquals("https://www.pagerduty.com/service-directory/Pshopping-cart",
                entityDto.getEntity().getIntegrations().get("pagerduty").get("serviceURL").asText());
        assertEquals("customValue",
                entityDto.getEntity().getExtensions().get("hertzbeat.apache.org/shopping-cart").get("customField").asText());
        assertEquals("https://github.com/myorganization/myrepo.git",
                entityDto.getEntity().getHertzbeat().get("codeLocations").get(0).get("repositoryURL").asText());
        assertEquals("deployment events", entityDto.getEntity().getHertzbeat().get("events").get(0).get("name").asText());
        assertEquals("checkout-main",
                entityDto.getEntity().getHertzbeat().get("pipelines").get("fingerprints").get(0).asText());
    }

    @Test
    void parseEntityDefinitionSupportsCanonicalOtelResourceIdentityKeys() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("""
                apiVersion: hertzbeat/v1
                kind: service
                metadata:
                  name: checkout-api
                  namespace: commerce
                spec:
                  telemetry:
                    identities:
                      - key: service.name
                        value: checkout-api
                        type: otel_resource
                        primary: true
                      - key: service.version
                        value: 2026.03.21
                        type: otel_resource
                      - key: container.name
                        value: checkout
                        type: otel_resource
                      - key: cloud.provider
                        value: alicloud
                        type: otel_resource
                      - key: cloud.region
                        value: cn-shanghai
                        type: otel_resource
                      - key: k8s.deployment.name
                        value: checkout-v1
                        type: otel_resource
                      - key: k8s.pod.name
                        value: checkout-v1-78dfd
                        type: otel_resource
                """);

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);

        Map<String, String> identities = new HashMap<>();
        entityDto.getIdentities().forEach(identity -> identities.put(identity.getIdentityKey(), identity.getIdentityValue()));
        assertEquals("checkout-api", identities.get("service.name"));
        assertEquals("2026.03.21", identities.get("service.version"));
        assertEquals("checkout", identities.get("container.name"));
        assertEquals("alicloud", identities.get("cloud.provider"));
        assertEquals("cn-shanghai", identities.get("cloud.region"));
        assertEquals("checkout-v1", identities.get("k8s.deployment.name"));
        assertEquals("checkout-v1-78dfd", identities.get("k8s.pod.name"));
    }

    @Test
    void parseEntityDefinitionSupportsCanonicalOtelResourceIdentityKeysFromJson() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("json");
        request.setContent("""
                {
                  "apiVersion": "hertzbeat/v1",
                  "kind": "service",
                  "metadata": {
                    "name": "checkout-api",
                    "namespace": "commerce"
                  },
                  "spec": {
                    "telemetry": {
                      "identities": [
                        {
                          "key": "service.name",
                          "value": "checkout-api",
                          "type": "otel_resource",
                          "primary": true
                        },
                        {
                          "key": "service.version",
                          "value": "2026.03.21",
                          "type": "otel_resource"
                        },
                        {
                          "key": "container.name",
                          "value": "checkout",
                          "type": "otel_resource"
                        },
                        {
                          "key": "cloud.provider",
                          "value": "alicloud",
                          "type": "otel_resource"
                        },
                        {
                          "key": "cloud.region",
                          "value": "cn-shanghai",
                          "type": "otel_resource"
                        },
                        {
                          "key": "k8s.deployment.name",
                          "value": "checkout-v1",
                          "type": "otel_resource"
                        },
                        {
                          "key": "k8s.pod.name",
                          "value": "checkout-v1-78dfd",
                          "type": "otel_resource"
                        }
                      ]
                    }
                  }
                }
                """);

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);

        Map<String, String> identities = new HashMap<>();
        entityDto.getIdentities().forEach(identity -> identities.put(identity.getIdentityKey(), identity.getIdentityValue()));
        assertEquals("checkout-api", identities.get("service.name"));
        assertEquals("2026.03.21", identities.get("service.version"));
        assertEquals("checkout", identities.get("container.name"));
        assertEquals("alicloud", identities.get("cloud.provider"));
        assertEquals("cn-shanghai", identities.get("cloud.region"));
        assertEquals("checkout-v1", identities.get("k8s.deployment.name"));
        assertEquals("checkout-v1-78dfd", identities.get("k8s.pod.name"));
    }

    @Test
    void parseEntityDefinitionAcceptsSpecScopedHertzBeatBlock() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("yaml");
        request.setContent("""
                apiVersion: hertzbeat/v1
                kind: api
                metadata:
                  name: checkout-public-api
                spec:
                  type: public-api
                  partOf: commerce-platform
                  hertzbeat:
                    codeLocations:
                      - repositoryURL: https://github.com/acme/checkout-api.git
                        paths:
                          - services/checkout-api/**
                    logs:
                      - name: api error logs
                        query: service:checkout-api status:error
                    performanceData:
                      tags:
                        - service:checkout-api
                    pipelines:
                      fingerprints:
                        - checkout-public-api-main
                """);

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);

        assertEquals("commerce-platform", entityDto.getEntity().getSystem());
        assertEquals("https://github.com/acme/checkout-api.git",
                entityDto.getEntity().getHertzbeat().get("codeLocations").get(0).get("repositoryURL").asText());
        assertEquals("api error logs",
                entityDto.getEntity().getHertzbeat().get("logs").get(0).get("name").asText());
        assertEquals("checkout-public-api-main",
                entityDto.getEntity().getHertzbeat().get("pipelines").get("fingerprints").get(0).asText());
    }

    @Test
    void hertzbeatV1DefinitionRoundTripKeepsHertzBeatBlocksAndCanonicalIdentities() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("json");
        request.setContent("""
                {
                  "apiVersion": "hertzbeat/v1",
                  "kind": "service",
                  "metadata": {
                    "name": "checkout-api",
                    "namespace": "commerce",
                    "displayName": "Checkout API",
                    "description": "Checkout service"
                  },
                  "spec": {
                    "owner": "payments-oncall",
                    "lifecycle": "production",
                    "tier": "tier1",
                    "partOf": "commerce",
                    "telemetry": {
                      "identities": [
                        {
                          "key": "service.name",
                          "value": "checkout-api",
                          "type": "otel_resource",
                          "primary": true
                        },
                        {
                          "key": "service.version",
                          "value": "2026.03.21",
                          "type": "otel_resource"
                        },
                        {
                          "key": "cloud.resource_id",
                          "value": "acs.ecs.checkout-1",
                          "type": "otel_resource"
                        }
                      ]
                    },
                    "dependsOn": [
                      "service:commerce/payments-api"
                    ]
                  },
                  "integrations": {
                    "pagerduty": {
                      "serviceURL": "https://www.pagerduty.com/service-directory/Pshopping-cart"
                    }
                  },
                  "extensions": {
                    "hertzbeat.apache.org/shopping-cart": {
                      "customField": "customValue"
                    }
                  },
                  "hertzbeat": {
                    "codeLocations": [
                      {
                        "repositoryURL": "https://github.com/myorganization/myrepo.git",
                        "paths": [
                          "services/checkout/**"
                        ]
                      }
                    ]
                  }
                }
                """);
        when(observeEntityDao.findFirstByTypeAndNamespaceAndName("service", "commerce", "payments-api"))
                .thenReturn(Optional.empty());
        when(observeEntityDao.findFirstByTypeAndName("service", "payments-api"))
                .thenReturn(Optional.empty());

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, null);
        entityDto.getEntity().setId(88L);
        entityDto.getIdentities().forEach(identity -> identity.setEntityId(88L));
        entityDto.getRelations().forEach(relation -> relation.setSourceEntityId(88L));

        when(observeEntityDao.findById(88L)).thenReturn(Optional.of(entityDto.getEntity()));
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(88L)).thenReturn(entityDto.getIdentities());
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(88L)).thenReturn(Collections.emptyList());
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(88L, 88L)).thenReturn(entityDto.getRelations());

        String definition = observeEntityService.getEntityDefinition(88L, "yaml");

        assertTrue(definition.contains("owner: payments-oncall"));
        assertTrue(definition.contains("lifecycle: production"));
        assertTrue(definition.contains("tier: tier1"));
        assertTrue(definition.contains("partOf: commerce"));
        assertTrue(definition.contains("integrations:"));
        assertTrue(definition.contains("serviceURL: https://www.pagerduty.com/service-directory/Pshopping-cart"));
        assertTrue(definition.contains("extensions:"));
        assertTrue(definition.contains("customField: customValue"));
        assertTrue(definition.contains("hertzbeat:"));
        assertTrue(definition.contains("codeLocations:"));
        assertTrue(definition.contains("repositoryURL: https://github.com/myorganization/myrepo.git"));
        assertTrue(definition.contains("key: service.version"));
        assertTrue(definition.contains("value: 2026.03.21"));
        assertTrue(definition.contains("key: cloud.resource_id"));
        assertTrue(definition.contains("value: acs.ecs.checkout-1"));
        assertTrue(definition.contains("targetRef: service:commerce/payments-api"));
    }

    @Test
    void modifyEntityPersistsUnresolvedRelationTargetRef() {
        ObserveEntity storedEntity = ObserveEntity.builder()
                .id(1L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .source("manual")
                .build();
        when(observeEntityDao.findById(1L)).thenReturn(Optional.of(storedEntity));
        when(observeEntityDao.save(any(ObserveEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(1L)).thenReturn(Collections.emptyList());
        when(observeEntityDao.findFirstByTypeAndNamespaceAndName("service", "commerce", "payments-api"))
                .thenReturn(Optional.empty());
        when(observeEntityDao.findFirstByTypeAndName("service", "payments-api"))
                .thenReturn(Optional.empty());

        EntityRelation relation = EntityRelation.builder()
                .sourceEntityId(1L)
                .targetRef("service:commerce/payments-api")
                .relationType("depends_on")
                .relationSource("manual")
                .status("confirmed")
                .score(100)
                .build();

        EntityDto entityDto = new EntityDto();
        entityDto.setEntityInfo(EntityInfo.fromEntity(storedEntity));
        entityDto.setIdentities(Collections.emptyList());
        entityDto.setMonitorBinds(Collections.emptyList());
        entityDto.setRelations(List.of(relation));

        observeEntityService.modifyEntity(entityDto);

        verify(entityRelationDao).deleteAllBySourceEntityId(1L);
        verify(entityRelationDao).flush();
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<EntityRelation>> relationCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityRelationDao).saveAll(relationCaptor.capture());
        List<EntityRelation> savedRows = relationCaptor.getValue();
        assertEquals(1, savedRows.size());
        assertEquals("service:commerce/payments-api", savedRows.getFirst().getTargetRef());
        assertEquals(null, savedRows.getFirst().getTargetEntityId());
    }

    @Test
    void parseEntityDefinitionSupportsLegacyShape() {
        EntityDefinitionRequest request = new EntityDefinitionRequest();
        request.setFormat("json");
        request.setContent("""
                {
                  "apiVersion": "hertzbeat/v1",
                  "kind": "service",
                  "metadata": {
                    "name": "payment-api",
                    "displayName": "Payment API",
                    "description": "Legacy draft",
                    "tags": ["team:payments", "system:commerce"]
                  },
                  "spec": {
                    "entityType": "service",
                    "source": "manual",
                    "owner": "payments-oncall",
                    "namespace": "commerce",
                    "environment": "prod",
                    "lifecycle": "production",
                    "tier": "tier1",
                    "systemName": "billing",
                    "links": [
                      {"name": "runbook", "type": "runbook", "url": "https://runbooks.local/payment"},
                      {"name": "repository", "type": "repository", "url": "https://git.local/payment"}
                    ],
                    "contacts": [
                      {"name": "slack", "type": "slack", "value": "#payments-alerts"}
                    ],
                    "telemetry": {
                      "identities": [
                        {"key": "service.name", "value": "payment-api", "source": "derived", "primary": true}
                      ],
                      "monitors": [
                        {"id": 301, "bindType": "manual", "status": "active"}
                      ]
                    },
                    "dependencies": [
                      {"targetEntityId": 302, "relationType": "depends_on", "status": "confirmed"}
                    ]
                  }
                }
                """);

        EntityDto entityDto = observeEntityService.parseEntityDefinition(request, 99L);

        assertEquals(99L, entityDto.getEntity().getId());
        assertEquals("service", entityDto.getEntity().getType());
        assertEquals("payment-api", entityDto.getEntity().getName());
        assertEquals("payments", entityDto.getEntity().getLabels().get("team"));
        assertEquals("https://runbooks.local/payment", entityDto.getEntity().getRunbook());
        assertEquals("production", entityDto.getEntity().getLifecycle());
        assertEquals("tier1", entityDto.getEntity().getTier());
        assertEquals("billing", entityDto.getEntity().getSystem());
        assertEquals(2, entityDto.getEntity().getLinks().size());
        assertEquals("#payments-alerts", entityDto.getEntity().getContacts().getFirst().getValue());
        assertEquals("derived", entityDto.getIdentities().getFirst().getIdentityType());
        assertEquals(301L, entityDto.getMonitorBinds().getFirst().getMonitorId());
        assertEquals(99L, entityDto.getRelations().getFirst().getSourceEntityId());
        assertEquals(302L, entityDto.getRelations().getFirst().getTargetEntityId());
    }

    @Test
    void getEntityDefinitionExportsCanonicalYaml() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(1L)
                .type("service")
                .name("checkout-api")
                .displayName("Checkout API")
                .subtype("web-service")
                .description("Checkout service")
                .source("manual")
                .owner("payments-oncall")
                .additionalOwners(List.of(new EntityOwnerRef("payments-platform", "team")))
                .namespace("commerce")
                .environment("prod")
                .criticality("high")
                .runbook("https://runbooks.local/checkout")
                .lifecycle("production")
                .tier("tier1")
                .system("commerce")
                .componentOf(List.of("checkout-domain"))
                .inheritFrom("service:platform/base-service")
                .languages(List.of("java", "kotlin"))
                .links(List.of(
                        new EntityCatalogLink("dashboard", "dashboard", "hertzbeat", "https://dashboards.local/checkout")
                ))
                .contacts(List.of(
                        new EntityCatalogContact("slack", "slack", "#payments-oncall")
                ))
                .integrations(JsonUtil.fromJson("""
                        {"pagerduty":{"serviceURL":"https://www.pagerduty.com/service-directory/Pcheckout"}}
                        """))
                .extensions(JsonUtil.fromJson("""
                        {"hertzbeat.apache.org/checkout":{"release-manager":"alice"}}
                        """))
                .hertzbeat(JsonUtil.fromJson("""
                        {
                          "codeLocations": [
                            {
                              "repositoryURL": "https://github.com/acme/checkout.git",
                              "paths": ["services/checkout/**"]
                            }
                          ],
                          "events": [
                            {
                              "name": "deployment events",
                              "query": "service:checkout source:github"
                            }
                          ],
                          "logs": [
                            {
                              "name": "critical logs",
                              "query": "service:checkout status:error"
                            }
                          ],
                          "performanceData": {
                            "tags": ["service:checkout-api", "team:payments"]
                          },
                          "pipelines": {
                            "fingerprints": ["checkout-main"]
                          }
                        }
                        """))
                .labels(Map.of("team", "payments"))
                .tags(List.of("team:payments", "region:cn-shanghai"))
                .build();
        when(observeEntityDao.findById(1L)).thenReturn(Optional.of(entity));
        when(observeEntityDao.findById(2L)).thenReturn(Optional.of(ObserveEntity.builder()
                .id(2L)
                .type("database")
                .name("checkout-db")
                .namespace("data")
                .source("manual")
                .build()));
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(1L)).thenReturn(List.of(EntityIdentity.builder()
                .entityId(1L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .identityType("derived")
                .priority(90)
                .primaryIdentity(true)
                .build()));
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(1L)).thenReturn(List.of(EntityMonitorBind.builder()
                .entityId(1L)
                .monitorId(101L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build()));
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(1L, 1L)).thenReturn(List.of(
                EntityRelation.builder().sourceEntityId(1L).targetEntityId(2L).relationType("depends_on")
                        .relationSource("manual").status("confirmed").score(100).build(),
                EntityRelation.builder().sourceEntityId(3L).targetEntityId(1L).relationType("depends_on")
                        .relationSource("manual").status("confirmed").score(100).build()
        ));

        String definition = observeEntityService.getEntityDefinition(1L, "yaml");
        assertTrue(definition.contains("apiVersion: hertzbeat/v1"));
        assertTrue(definition.contains("kind: service"));
        assertTrue(definition.contains("type: web-service"));
        assertTrue(definition.contains("namespace: commerce"));
        assertTrue(definition.contains("owner: payments-oncall"));
        assertTrue(definition.contains("additionalOwners:"));
        assertTrue(definition.contains("name: payments-platform"));
        assertTrue(definition.contains("type: team"));
        assertTrue(definition.contains("labels:"));
        assertTrue(definition.contains("team: payments"));
        assertTrue(definition.contains("- team:payments"));
        assertTrue(definition.contains("- region:cn-shanghai"));
        assertTrue(definition.contains("inheritFrom: service:platform/base-service"));
        assertTrue(definition.contains("runbook: https://runbooks.local/checkout"));
        assertTrue(definition.contains("lifecycle: production"));
        assertTrue(definition.contains("tier: tier1"));
        assertTrue(definition.contains("partOf: commerce"));
        assertTrue(definition.contains("componentOf:"));
        assertTrue(definition.contains("- checkout-domain"));
        assertTrue(definition.contains("languages:"));
        assertTrue(definition.contains("- java"));
        assertTrue(definition.contains("ownedBy: payments-oncall"));
        assertTrue(definition.contains("- datastore:data/checkout-db"));
        assertTrue(definition.contains("type: dashboard"));
        assertTrue(definition.contains("provider: hertzbeat"));
        assertTrue(definition.contains("contact: '#payments-oncall'"));
        assertTrue(definition.contains("monitorId: 101"));
        assertTrue(definition.contains("targetEntityId: 2"));
        assertTrue(definition.contains("integrations:"));
        assertTrue(definition.contains("serviceURL: https://www.pagerduty.com/service-directory/Pcheckout"));
        assertTrue(definition.contains("extensions:"));
        assertTrue(definition.contains("release-manager: alice"));
        assertTrue(definition.contains("hertzbeat:"));
        assertTrue(definition.contains("codeLocations:"));
        assertTrue(definition.contains("repositoryURL: https://github.com/acme/checkout.git"));
        assertTrue(definition.contains("performanceData:"));
        assertTrue(definition.contains("fingerprints:"));
        assertFalse(definition.contains("targetEntityId: 3"));
        assertFalse(definition.contains("kind: Entity"));
        assertFalse(definition.contains("type: service"));
        assertFalse(definition.contains("system: commerce"));
    }

    @Test
    void getEntityDefinitionExportsCanonicalOtelResourceIdentityKeys() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(21L)
                .type("service")
                .name("inventory-api")
                .namespace("commerce")
                .source("otel_resource")
                .build();
        when(observeEntityDao.findById(21L)).thenReturn(Optional.of(entity));
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(21L)).thenReturn(Collections.emptyList());
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(21L, 21L)).thenReturn(Collections.emptyList());
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(21L)).thenReturn(List.of(
                EntityIdentity.builder().entityId(21L).identityKey("service.name").identityValue("inventory-api")
                        .identityType("otel_resource").priority(90).primaryIdentity(true).build(),
                EntityIdentity.builder().entityId(21L).identityKey("service.version").identityValue("1.8.0")
                        .identityType("otel_resource").priority(15).primaryIdentity(false).build(),
                EntityIdentity.builder().entityId(21L).identityKey("container.name").identityValue("inventory")
                        .identityType("otel_resource").priority(70).primaryIdentity(false).build(),
                EntityIdentity.builder().entityId(21L).identityKey("cloud.provider").identityValue("aws")
                        .identityType("otel_resource").priority(10).primaryIdentity(false).build(),
                EntityIdentity.builder().entityId(21L).identityKey("cloud.region").identityValue("ap-southeast-1")
                        .identityType("otel_resource").priority(10).primaryIdentity(false).build(),
                EntityIdentity.builder().entityId(21L).identityKey("k8s.deployment.name").identityValue("inventory-v1")
                        .identityType("otel_resource").priority(90).primaryIdentity(false).build(),
                EntityIdentity.builder().entityId(21L).identityKey("k8s.pod.name").identityValue("inventory-v1-abc")
                        .identityType("otel_resource").priority(80).primaryIdentity(false).build()
        ));

        String definition = observeEntityService.getEntityDefinition(21L, "yaml");

        assertTrue(definition.contains("key: service.version"));
        assertTrue(definition.contains("value: 1.8.0"));
        assertTrue(definition.contains("key: container.name"));
        assertTrue(definition.contains("value: inventory"));
        assertTrue(definition.contains("key: cloud.provider"));
        assertTrue(definition.contains("value: aws"));
        assertTrue(definition.contains("key: cloud.region"));
        assertTrue(definition.contains("value: ap-southeast-1"));
        assertTrue(definition.contains("key: k8s.deployment.name"));
        assertTrue(definition.contains("value: inventory-v1"));
        assertTrue(definition.contains("key: k8s.pod.name"));
        assertTrue(definition.contains("value: inventory-v1-abc"));
    }

    @Test
    void getSystemEntityDefinitionExportsCanonicalComponents() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(11L)
                .type("system")
                .name("commerce-platform")
                .owner("commerce-oncall")
                .source("manual")
                .components(List.of("service:commerce/checkout-api", "datastore:data/order-db"))
                .build();
        when(observeEntityDao.findById(11L)).thenReturn(Optional.of(entity));
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(11L)).thenReturn(Collections.emptyList());
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(11L)).thenReturn(Collections.emptyList());
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(11L, 11L)).thenReturn(Collections.emptyList());

        String definition = observeEntityService.getEntityDefinition(11L, "yaml");

        assertTrue(definition.contains("kind: system"));
        assertTrue(definition.contains("components:"));
        assertTrue(definition.contains("- service:commerce/checkout-api"));
        assertTrue(definition.contains("- datastore:data/order-db"));
        assertFalse(definition.contains("componentOf:"));
    }

    @Test
    void getEntityDefinitionPrefersStoredTargetRef() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(1L)
                .type("service")
                .name("checkout-api")
                .source("manual")
                .build();
        when(observeEntityDao.findById(1L)).thenReturn(Optional.of(entity));
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(1L)).thenReturn(Collections.emptyList());
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(1L)).thenReturn(Collections.emptyList());
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(1L, 1L)).thenReturn(List.of(
                EntityRelation.builder()
                        .sourceEntityId(1L)
                        .targetRef("service:commerce/payments-api")
                        .relationType("depends_on")
                        .relationSource("manual")
                        .status("confirmed")
                        .score(100)
                        .build()
        ));

        String definition = observeEntityService.getEntityDefinition(1L, "yaml");

        assertTrue(definition.contains("- service:commerce/payments-api"));
        assertTrue(definition.contains("targetRef: service:commerce/payments-api"));
    }

    @Test
    void getEntityDefinitionShouldNotFailWhenSpecTypeIsImplicit() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(2L)
                .type("service")
                .name("inventory-api")
                .source("manual")
                .build();
        when(observeEntityDao.findById(2L)).thenReturn(Optional.of(entity));
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(2L)).thenReturn(Collections.emptyList());
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(2L)).thenReturn(Collections.emptyList());
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(2L, 2L)).thenReturn(Collections.emptyList());

        String definition = assertDoesNotThrow(() -> observeEntityService.getEntityDefinition(2L, "yaml"));

        assertTrue(definition.contains("apiVersion: hertzbeat/v1"));
        assertTrue(definition.contains("kind: service"));
        assertFalse(definition.contains("type: service"));
    }

    @Test
    void getApiEntityDefinitionExportsApiKind() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(12L)
                .type("api")
                .name("checkout-public-api")
                .namespace("commerce")
                .subtype("public-api")
                .system("commerce-platform")
                .implementedBy(List.of("service:commerce/checkout-api"))
                .apiInterface(JsonUtil.fromJson("""
                        {
                          "fileRef": "https://schemas.example.com/checkout/openapi.yaml"
                        }
                        """))
                .source("manual")
                .build();
        when(observeEntityDao.findById(12L)).thenReturn(Optional.of(entity));
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(12L)).thenReturn(Collections.emptyList());
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(12L)).thenReturn(Collections.emptyList());
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(12L, 12L)).thenReturn(Collections.emptyList());

        String definition = observeEntityService.getEntityDefinition(12L, "yaml");

        assertTrue(definition.contains("kind: api"));
        assertTrue(definition.contains("type: public-api"));
        assertTrue(definition.contains("partOf: commerce-platform"));
        assertTrue(definition.contains("implementedBy:"));
        assertTrue(definition.contains("- service:commerce/checkout-api"));
        assertTrue(definition.contains("fileRef: https://schemas.example.com/checkout/openapi.yaml"));
    }

    @Test
    void getEndpointEntityDefinitionExportsEndpointKind() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(13L)
                .type("endpoint")
                .name("https://checkout.example.com/health")
                .displayName("checkout-health-endpoint")
                .owner("catalog-oncall")
                .source("otel_resource")
                .build();
        when(observeEntityDao.findById(13L)).thenReturn(Optional.of(entity));
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(13L)).thenReturn(List.of(
                EntityIdentity.builder()
                        .id(131L)
                        .entityId(13L)
                        .identityKey("endpoint.url")
                        .identityValue("https://checkout.example.com/health")
                        .identityType("otel_resource")
                        .priority(120)
                        .primaryIdentity(true)
                        .build()
        ));
        when(entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(13L)).thenReturn(Collections.emptyList());
        when(entityRelationDao.findBySourceEntityIdOrTargetEntityId(13L, 13L)).thenReturn(Collections.emptyList());

        String definition = observeEntityService.getEntityDefinition(13L, "yaml");

        assertTrue(definition.contains("kind: endpoint"));
        assertFalse(definition.contains("kind: api"));
        assertTrue(definition.contains("name: https://checkout.example.com/health"));
        assertTrue(definition.contains("ownedBy: catalog-oncall"));
        assertTrue(definition.contains("key: endpoint.url"));
    }
}
