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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.dao.EntityIdentityDao;
import org.apache.hertzbeat.manager.dao.EntityRelationDao;
import org.apache.hertzbeat.manager.dao.ObserveEntityDao;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds local-only demo topology relations so fresh local H2 catalogs do not render node-only graphs.
 */
@Component
@Profile("local")
@Slf4j
public class LocalTopologyDemoRelationSeeder implements ApplicationRunner {

    private static final String MIXED_SCALE_PROOF_SEED_OPTION = "hertzbeat.topology.local-scale-proof-seed";
    private static final String WORKSPACE_ID = AuthTokenScopes.DEFAULT_WORKSPACE_ID;
    private static final String NAMESPACE = "commerce";
    private static final String ENVIRONMENT = "prod";
    private static final String SEED_NAME = "local-topology-demo-seed";
    private static final String MIXED_PROOF_BATCH = "hb-mix-1780329856";
    private static final String MIXED_PROOF_NAMESPACE = "scale-mix";
    private static final long MIXED_PROOF_ENTITY_ID_BASE = 646566130000000L;

    private final ObserveEntityDao observeEntityDao;
    private final EntityRelationDao entityRelationDao;
    private final EntityIdentityDao entityIdentityDao;

    public LocalTopologyDemoRelationSeeder(ObserveEntityDao observeEntityDao,
                                           EntityRelationDao entityRelationDao,
                                           EntityIdentityDao entityIdentityDao) {
        this.observeEntityDao = observeEntityDao;
        this.entityRelationDao = entityRelationDao;
        this.entityIdentityDao = entityIdentityDao;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedDemoRelations();
        if (isMixedScaleProofSeedEnabled(args)) {
            seedMixedScaleProofEntities();
        } else {
            log.info("Skipped local mixed topology scale proof seed. Enable with --{}=true.",
                    MIXED_SCALE_PROOF_SEED_OPTION);
        }
    }

    boolean isMixedScaleProofSeedEnabled(ApplicationArguments args) {
        if (args == null || !args.containsOption(MIXED_SCALE_PROOF_SEED_OPTION)) {
            return false;
        }
        List<String> values = args.getOptionValues(MIXED_SCALE_PROOF_SEED_OPTION);
        return values != null && values.stream().anyMatch(value -> "true".equalsIgnoreCase(value));
    }

    void seedDemoRelations() {
        Optional<ObserveEntity> checkout = findDemoEntity("service", "Checkout API");
        Optional<ObserveEntity> payment = findDemoEntity("service", "Payment API");
        Optional<ObserveEntity> orders = findDemoEntity("database", "Orders DB");
        if (checkout.isEmpty() || payment.isEmpty() || orders.isEmpty()) {
            return;
        }

        List<EntityRelation> missingRelations = new ArrayList<>();
        if (!relationExists(checkout.get().getId(), payment.get().getId(), "trace-call")) {
            missingRelations.add(EntityRelation.builder()
                    .sourceEntityId(checkout.get().getId())
                    .targetEntityId(payment.get().getId())
                    .targetRef("service:commerce/Payment API")
                    .relationType("trace-call")
                    .relationSource("otlp-trace-call")
                    .status("confirmed")
                    .score(96)
                    .description("Checkout API calls Payment API in the local topology demo.")
                    .attributes(seedAttributes("outbound"))
                    .build());
        }
        if (!relationExists(payment.get().getId(), orders.get().getId(), "depends_on")) {
            missingRelations.add(EntityRelation.builder()
                    .sourceEntityId(payment.get().getId())
                    .targetEntityId(orders.get().getId())
                    .targetRef("database:commerce/Orders DB")
                    .relationType("depends_on")
                    .relationSource("cmdb-manual-label")
                    .status("confirmed")
                    .score(94)
                    .description("Payment API depends on Orders DB in the local topology demo.")
                    .attributes(seedAttributes("outbound"))
                    .build());
        }
        if (!missingRelations.isEmpty()) {
            entityRelationDao.saveAll(missingRelations);
            log.info("Seeded {} local topology demo relation(s).", missingRelations.size());
        }
    }

    void seedMixedScaleProofEntities() {
        List<ObserveEntity> missingEntities = new ArrayList<>();
        List<EntityIdentity> missingIdentities = new ArrayList<>();
        List<String> serviceNames = mixedScaleProofServiceNames();
        Map<String, ObserveEntity> entitiesByName = new java.util.LinkedHashMap<>();

        for (int index = 0; index < serviceNames.size(); index += 1) {
            String serviceName = serviceNames.get(index);
            Optional<ObserveEntity> existingEntity = findMixedScaleProofEntity(serviceName);
            if (existingEntity.isPresent()) {
                entitiesByName.put(serviceName, existingEntity.get());
                if (!hasServiceNameIdentity(existingEntity.get().getId(), serviceName)) {
                    missingIdentities.add(serviceNameIdentity(existingEntity.get().getId(), serviceName));
                }
                continue;
            }
            long entityId = MIXED_PROOF_ENTITY_ID_BASE + index;
            ObserveEntity entity = ObserveEntity.builder()
                    .id(entityId)
                    .workspaceId(WORKSPACE_ID)
                    .type("service")
                    .namespace(MIXED_PROOF_NAMESPACE)
                    .name(serviceName)
                    .displayName(displayName(serviceName))
                    .environment(ENVIRONMENT)
                    .source("local-scale-proof")
                    .status("unknown")
                    .criticality("medium")
                    .owner("local-scale-proof")
                    .lifecycle("local")
                    .build();
            missingEntities.add(entity);
            entitiesByName.put(serviceName, entity);
            missingIdentities.add(serviceNameIdentity(entityId, serviceName));
        }

        if (!missingEntities.isEmpty()) {
            observeEntityDao.saveAll(missingEntities);
            log.info("Seeded {} local mixed topology scale proof entity row(s).", missingEntities.size());
        }
        if (!missingIdentities.isEmpty()) {
            entityIdentityDao.saveAll(missingIdentities);
            log.info("Seeded {} local mixed topology scale proof service.name identity row(s).",
                    missingIdentities.size());
        }
        seedMixedScaleProofRelations(entitiesByName);
    }

    void seedMixedScaleProofRelations(Map<String, ObserveEntity> entitiesByName) {
        if (entitiesByName == null || entitiesByName.isEmpty()) {
            return;
        }
        List<EntityRelation> missingRelations = new ArrayList<>();
        String gatewayName = MIXED_PROOF_BATCH + "-edge-gateway";
        ObserveEntity gateway = entitiesByName.get(gatewayName);
        if (gateway == null || gateway.getId() == null) {
            return;
        }
        Map<Long, List<EntityRelation>> relationCacheBySource = new java.util.LinkedHashMap<>();

        for (int domainIndex = 0; domainIndex < 12; domainIndex += 1) {
            String domainName = mixedScaleProofDomainName(domainIndex);
            ObserveEntity domain = entitiesByName.get(domainName);
            if (domain == null || domain.getId() == null) {
                continue;
            }
            addMissingMixedScaleProofRelation(
                    relationCacheBySource,
                    missingRelations, gateway, domain, "trace-call", "otlp-trace-call",
                    "local mixed topology scale proof gateway to domain call");
            for (int serviceIndex = 0; serviceIndex < 165; serviceIndex += 1) {
                ObserveEntity service = entitiesByName.get(mixedScaleProofServiceName(domainIndex, serviceIndex));
                if (service == null || service.getId() == null) {
                    continue;
                }
                addMissingMixedScaleProofRelation(
                        relationCacheBySource,
                        missingRelations, domain, service, "trace-call", "otlp-trace-call",
                        "local mixed topology scale proof domain to service call");
            }
        }

        if (!missingRelations.isEmpty()) {
            entityRelationDao.saveAll(missingRelations);
            log.info("Seeded {} local mixed topology scale proof relation row(s).", missingRelations.size());
        }
    }

    private void addMissingMixedScaleProofRelation(Map<Long, List<EntityRelation>> relationCacheBySource,
                                                   List<EntityRelation> missingRelations,
                                                   ObserveEntity source,
                                                   ObserveEntity target,
                                                   String relationType,
                                                   String relationSource,
                                                   String description) {
        if (!relationExists(relationCacheBySource, source.getId(), target.getId(), relationType)) {
            missingRelations.add(EntityRelation.builder()
                    .sourceEntityId(source.getId())
                    .targetEntityId(target.getId())
                    .targetRef("%s:%s/%s".formatted(target.getType(), target.getNamespace(), target.getName()))
                    .relationType(relationType)
                    .relationSource(relationSource)
                    .status("confirmed")
                    .score(92)
                    .description(description)
                    .attributes(seedAttributes("outbound"))
                    .build());
        }
    }

    private boolean hasServiceNameIdentity(Long entityId, String serviceName) {
        return entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(entityId)
                .stream()
                .anyMatch(identity -> "service.name".equals(identity.getIdentityKey())
                        && serviceName.equals(identity.getIdentityValue()));
    }

    private EntityIdentity serviceNameIdentity(Long entityId, String serviceName) {
        return EntityIdentity.builder()
                .entityId(entityId)
                .identityType("otel_resource")
                .identityKey("service.name")
                .identityValue(serviceName)
                .normalizedValue(serviceName.toLowerCase(java.util.Locale.ROOT))
                .priority(100)
                .primaryIdentity(true)
                .build();
    }

    private Optional<ObserveEntity> findDemoEntity(String type, String name) {
        return observeEntityDao
                .findFirstByWorkspaceIdAndTypeAndNamespaceAndName(WORKSPACE_ID, type, NAMESPACE, name)
                .filter(entity -> ENVIRONMENT.equals(entity.getEnvironment()));
    }

    private Optional<ObserveEntity> findMixedScaleProofEntity(String name) {
        return observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                WORKSPACE_ID, "service", MIXED_PROOF_NAMESPACE, name);
    }

    private List<String> mixedScaleProofServiceNames() {
        List<String> serviceNames = new ArrayList<>();
        serviceNames.add(MIXED_PROOF_BATCH + "-edge-gateway");
        for (int domainIndex = 0; domainIndex < 12; domainIndex += 1) {
            serviceNames.add(mixedScaleProofDomainName(domainIndex));
        }
        for (int domainIndex = 0; domainIndex < 12; domainIndex += 1) {
            for (int serviceIndex = 0; serviceIndex < 165; serviceIndex += 1) {
                serviceNames.add(mixedScaleProofServiceName(domainIndex, serviceIndex));
            }
        }
        return serviceNames;
    }

    private String mixedScaleProofDomainName(int domainIndex) {
        return "%s-domain-%02d".formatted(MIXED_PROOF_BATCH, domainIndex);
    }

    private String mixedScaleProofServiceName(int domainIndex, int serviceIndex) {
        return "%s-svc-%02d-%03d".formatted(MIXED_PROOF_BATCH, domainIndex, serviceIndex);
    }

    private String displayName(String serviceName) {
        if (serviceName.equals(MIXED_PROOF_BATCH + "-edge-gateway")) {
            return "Mixed Edge Gateway";
        }
        if (serviceName.contains("-domain-")) {
            return "Domain " + serviceName.substring(serviceName.lastIndexOf('-') + 1) + " Gateway";
        }
        return serviceName;
    }

    private boolean relationExists(Long sourceEntityId, Long targetEntityId, String relationType) {
        return entityRelationDao.findBySourceEntityIdOrTargetEntityId(sourceEntityId, sourceEntityId)
                .stream()
                .anyMatch(relation -> sourceEntityId.equals(relation.getSourceEntityId())
                        && targetEntityId.equals(relation.getTargetEntityId())
                        && relationType.equals(relation.getRelationType()));
    }

    private boolean relationExists(Map<Long, List<EntityRelation>> relationCacheBySource,
                                   Long sourceEntityId,
                                   Long targetEntityId,
                                   String relationType) {
        List<EntityRelation> sourceRelations = relationCacheBySource.computeIfAbsent(sourceEntityId,
                source -> entityRelationDao.findBySourceEntityIdOrTargetEntityId(source, source));
        return sourceRelations.stream()
                .anyMatch(relation -> sourceEntityId.equals(relation.getSourceEntityId())
                        && targetEntityId.equals(relation.getTargetEntityId())
                        && relationType.equals(relation.getRelationType()));
    }

    private Map<String, String> seedAttributes(String direction) {
        return Map.of(
                "seed", SEED_NAME,
                "direction", direction
        );
    }
}
