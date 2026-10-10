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

package org.apache.hertzbeat.observability.instrumentation.guide;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.springframework.stereotype.Component;

/** Resolves one reviewable adapter per language family. */
@Component
public class InstrumentationGuideAdapterRegistry {

    private final Map<Language, InstrumentationGuideAdapter> adapters;

    public InstrumentationGuideAdapterRegistry(List<InstrumentationGuideAdapter> adapters) {
        EnumMap<Language, InstrumentationGuideAdapter> indexed = new EnumMap<>(Language.class);
        for (InstrumentationGuideAdapter adapter : adapters) {
            if (indexed.put(adapter.language(), adapter) != null) {
                throw new IllegalStateException("Duplicate instrumentation guide adapter");
            }
        }
        this.adapters = Map.copyOf(indexed);
    }

    public InstrumentationGuideAdapter require(Language language) {
        InstrumentationGuideAdapter adapter = adapters.get(language);
        if (adapter == null) {
            throw new IllegalArgumentException("No instrumentation guide adapter for language");
        }
        return adapter;
    }

    public static InstrumentationGuideAdapterRegistry official() {
        return new InstrumentationGuideAdapterRegistry(List.of(
                new JavaInstrumentationGuideAdapter(),
                new DotnetInstrumentationGuideAdapter(),
                new NodeInstrumentationGuideAdapter(),
                new PythonInstrumentationGuideAdapter(),
                new PhpInstrumentationGuideAdapter(),
                new GoInstrumentationGuideAdapter(),
                new GenericInstrumentationGuideAdapter()));
    }
}
