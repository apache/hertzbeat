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

package org.apache.hertzbeat.collector.dispatch.unit.impl;

import org.apache.hertzbeat.collector.dispatch.unit.DataUnit;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * the convert of data size
 */
@Component
public final class DataSizeConvert extends AbstractUnitConvert {


    /**
     * convert the enumeration of DataUnit to  map where the key is the unit and the value is the conversion coefficient.
     */
    @Override
    Map<String, Long> convertUnitEnumToMap() {
        return Arrays.stream(DataUnit.values()).collect(Collectors.toMap(DataUnit::getUnit, DataUnit::getScale));
    }


}
