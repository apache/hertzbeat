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

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.vm;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * promql query content
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PromQlQueryContent {

    private String status;

    private ContentData data;

    /**
     * content data
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static final class ContentData {

        private String resultType;

        private List<Content> result;

        /**
         * content
         */
        @Data
        @AllArgsConstructor
        @NoArgsConstructor
        public static final class Content {

            /**
             * metric contains metric name plus labels for a particular time series
             */
            private Map<String, String> metric;

            /**
             * values contains raw sample values for the given time series
             * value-timestamp
             * [1700993195,"436960986"]
             */
            private Object[] value;

            /**
             * values contains raw sample values for the given time series
             * value-timestamp list
             * [[1700993195,"436960986"],[1700993195,"436960986"]...]
             */
            private List<Object[]> values;
        }
    }
}
