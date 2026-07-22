/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.springframework.stereotype.Service;

/** Version 1 read, validation, and conditional command application service. */
@Service
@RequiredArgsConstructor
public class MonitorDefinitionService {

    private static final int SCHEMA_VERSION = 1;
    private static final Pattern REVISION = Pattern.compile("[0-9a-f]{64}");
    private static final Comparator<MonitorDefinitionCatalogItem> CATALOG_ORDER =
            Comparator.comparing(MonitorDefinitionCatalogItem::label)
                    .thenComparing(MonitorDefinitionCatalogItem::app);

    private final MonitorDefinitionSourceReader sourceReader;
    private final MonitorDefinitionCommandPort commandPort;

    public MonitorDefinitionCatalogResponse catalog(String lang) {
        List<MonitorDefinitionCatalogItem> items = sourceReader.readAll().stream()
                .map(source -> catalogItem(source, lang))
                .sorted(CATALOG_ORDER)
                .toList();
        return new MonitorDefinitionCatalogResponse(SCHEMA_VERSION, items);
    }

    public MonitorDefinitionDetailResponse detail(String requestedApp, String lang) {
        requireSafeApp(requestedApp);
        MonitorDefinitionSource source = find(requestedApp, sourceReader.readAll());
        MonitorDefinitionCatalogItem item = catalogItem(source, lang);
        return new MonitorDefinitionDetailResponse(
                SCHEMA_VERSION,
                item.app(),
                item.label(),
                item.origin(),
                item.editable(),
                item.deletable(),
                source.definition(),
                item.revision());
    }

    public MonitorDefinitionDetailResponse create(MonitorDefinitionWriteRequest request, String lang) {
        return detail(commandPort.create(request.definition()), lang);
    }

    public MonitorDefinitionDetailResponse update(
            String app, String ifMatch, MonitorDefinitionWriteRequest request, String lang) {
        requireSafeApp(app);
        return detail(commandPort.update(app, parseIfMatch(ifMatch), request.definition()), lang);
    }

    public MonitorDefinitionDeleteResponse delete(String app, String ifMatch) {
        requireSafeApp(app);
        return commandPort.delete(app, parseIfMatch(ifMatch));
    }

    public MonitorDefinitionValidationResponse validate(MonitorDefinitionValidationRequest request) {
        requireExpectedAppShape(request);
        Job parsed = parseAndValidate(request.definition());
        requireSafeApp(parsed.getApp());
        List<MonitorDefinitionSource> sources = sourceReader.readAll();
        if (request.operation() == MonitorDefinitionOperation.CREATE) {
            return validateCreate(parsed, sources);
        }
        return validateUpdate(request.expectedApp(), parsed, sources);
    }

    private MonitorDefinitionValidationResponse validateCreate(Job parsed, List<MonitorDefinitionSource> sources) {
        if (findOptional(parsed.getApp(), sources) != null) {
            throw new MonitorDefinitionException(MonitorDefinitionErrorCode.CREATE_CONFLICT);
        }
        return validationResponse(parsed.getApp(), MonitorDefinitionOrigin.CUSTOM);
    }

    private MonitorDefinitionValidationResponse validateUpdate(
            String expectedApp, Job parsed, List<MonitorDefinitionSource> sources) {
        MonitorDefinitionSource target = find(expectedApp, sources);
        String canonicalApp = target.job().getApp();
        if (!canonicalApp.equals(expectedApp) || !canonicalApp.equals(parsed.getApp())) {
            throw new MonitorDefinitionException(MonitorDefinitionErrorCode.UPDATE_TARGET_MISMATCH);
        }
        MonitorDefinitionOrigin origin = MonitorDefinitionRevision.origin(target);
        if (origin == MonitorDefinitionOrigin.BUILTIN) {
            throw new MonitorDefinitionException(MonitorDefinitionErrorCode.IMMUTABLE);
        }
        return validationResponse(canonicalApp, origin);
    }

    private Job parseAndValidate(String definition) {
        try {
            return sourceReader.validate(definition);
        } catch (RuntimeException error) {
            throw new MonitorDefinitionException(MonitorDefinitionErrorCode.INVALID_DEFINITION);
        }
    }

    private static void requireExpectedAppShape(MonitorDefinitionValidationRequest request) {
        if (request.operation() == MonitorDefinitionOperation.CREATE) {
            if (request.expectedApp() != null) {
                throw new MonitorDefinitionException(MonitorDefinitionErrorCode.EXPECTED_APP_UNEXPECTED);
            }
            return;
        }
        if (StringUtils.isBlank(request.expectedApp())) {
            throw new MonitorDefinitionException(MonitorDefinitionErrorCode.EXPECTED_APP_REQUIRED);
        }
        requireSafeApp(request.expectedApp());
    }

    private static MonitorDefinitionValidationResponse validationResponse(
            String app, MonitorDefinitionOrigin origin) {
        return new MonitorDefinitionValidationResponse(SCHEMA_VERSION, true, app, origin);
    }

    private static MonitorDefinitionCatalogItem catalogItem(MonitorDefinitionSource source, String lang) {
        MonitorDefinitionOrigin origin = MonitorDefinitionRevision.origin(source);
        boolean mutable = origin != MonitorDefinitionOrigin.BUILTIN;
        String app = source.job().getApp();
        String label = CommonUtil.getLangMappingValueFromI18nMap(normalizeLang(lang), source.job().getName());
        return new MonitorDefinitionCatalogItem(
                app, label == null ? app : label, origin, mutable, mutable, MonitorDefinitionRevision.from(source));
    }

    private static MonitorDefinitionDetailResponse detail(MonitorDefinitionSource source, String lang) {
        MonitorDefinitionCatalogItem item = catalogItem(source, lang);
        return new MonitorDefinitionDetailResponse(
                SCHEMA_VERSION,
                item.app(),
                item.label(),
                item.origin(),
                item.editable(),
                item.deletable(),
                source.definition(),
                item.revision());
    }

    private static MonitorDefinitionSource find(String app, List<MonitorDefinitionSource> sources) {
        MonitorDefinitionSource source = findOptional(app, sources);
        if (source == null) {
            throw new MonitorDefinitionException(MonitorDefinitionErrorCode.NOT_FOUND);
        }
        return source;
    }

    private static MonitorDefinitionSource findOptional(String app, List<MonitorDefinitionSource> sources) {
        String identity = MonitorDefinitionIdentity.normalize(app);
        return sources.stream()
                .filter(source -> MonitorDefinitionIdentity.normalize(source.job().getApp()).equals(identity))
                .findFirst()
                .orElse(null);
    }

    private static void requireSafeApp(String app) {
        MonitorDefinitionIdentity.requireSafe(app);
    }

    private static String parseIfMatch(String ifMatch) {
        if (ifMatch == null || ifMatch.isBlank()) {
            throw new MonitorDefinitionException(MonitorDefinitionErrorCode.REVISION_REQUIRED);
        }
        if (ifMatch.length() != 66 || ifMatch.charAt(0) != '"' || ifMatch.charAt(65) != '"') {
            throw new MonitorDefinitionException(MonitorDefinitionErrorCode.REVISION_INVALID);
        }
        String revision = ifMatch.substring(1, 65);
        if (!REVISION.matcher(revision).matches()) {
            throw new MonitorDefinitionException(MonitorDefinitionErrorCode.REVISION_INVALID);
        }
        return revision;
    }

    private static String normalizeLang(String lang) {
        if (lang == null || lang.isEmpty()) {
            return "zh-CN";
        }
        if (lang.contains(Locale.ENGLISH.getLanguage())) {
            return "en-US";
        }
        return lang.contains(Locale.CHINESE.getLanguage()) ? "zh-CN" : "en-US";
    }
}
