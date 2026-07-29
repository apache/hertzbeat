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

package org.apache.hertzbeat.alert.integration.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.CatalogResponse;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.IntegrationGuide;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationRequestException;
import org.apache.hertzbeat.alert.integration.guide.AlertIntegrationDescriptor;
import org.apache.hertzbeat.alert.integration.guide.AlertIntegrationDescriptorRegistry;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Builds alert integration read models from the registered ingress adapters.
 */
@Service
public class AlertIntegrationCatalogService {

    private final List<ExternAlertService> externAlertServices;
    private final AlertIntegrationDescriptorRegistry descriptorRegistry;

    public AlertIntegrationCatalogService(
            List<ExternAlertService> externAlertServices,
            AlertIntegrationDescriptorRegistry descriptorRegistry) {
        this.externAlertServices = List.copyOf(externAlertServices);
        this.descriptorRegistry = descriptorRegistry;
    }

    public CatalogResponse catalog() {
        requireAlignedDescriptors();
        return new CatalogResponse(descriptorRegistry.descriptors().stream()
                .map(AlertIntegrationDescriptor::guide)
                .map(IntegrationGuide::toCatalogItem)
                .toList());
    }

    public IntegrationGuide render(String source) {
        if (!StringUtils.hasText(source)) {
            throw AlertIntegrationRequestException.sourceUnsupported();
        }
        String normalizedSource = source.trim();
        AlertIntegrationDescriptor descriptor = descriptorRegistry.findByPublicSource(normalizedSource);
        if (descriptor == null) {
            throw AlertIntegrationRequestException.sourceUnsupported();
        }
        requireAlignedDescriptors();
        return descriptor.guide();
    }

    private void requireAlignedDescriptors() {
        Map<String, ExternAlertService> servicesBySource = new LinkedHashMap<>();
        for (ExternAlertService service : externAlertServices) {
            if (service == null || !StringUtils.hasText(service.supportSource())
                    || servicesBySource.put(service.supportSource(), service) != null) {
                throw AlertIntegrationRequestException.guideUnavailable();
            }
        }
        if (!descriptorRegistry.ingressSources().equals(servicesBySource.keySet())) {
            throw AlertIntegrationRequestException.guideUnavailable();
        }
    }
}
