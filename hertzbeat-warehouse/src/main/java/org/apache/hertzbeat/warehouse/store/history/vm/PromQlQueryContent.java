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
