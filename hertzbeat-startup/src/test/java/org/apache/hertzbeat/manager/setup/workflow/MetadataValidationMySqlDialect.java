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

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Types;
import org.hibernate.dialect.MySQLDialect;

/** Keeps schema validation compatible with boolean encodings used by the committed MySQL migrations. */
public final class MetadataValidationMySqlDialect extends MySQLDialect {

    @Override
    public boolean equivalentTypes(int firstTypeCode, int secondTypeCode) {
        if (isBooleanType(firstTypeCode) && isBooleanType(secondTypeCode)) {
            return true;
        }
        return super.equivalentTypes(firstTypeCode, secondTypeCode);
    }

    private static boolean isBooleanType(int typeCode) {
        return typeCode == Types.BIT || typeCode == Types.BOOLEAN || typeCode == Types.TINYINT;
    }
}
