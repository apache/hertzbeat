package org.apache.hertzbeat.collector.collect.common;

import com.google.protobuf.ByteString;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.arrow.ArrowVectorWriter;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MetricsDataBuilder {
    private CollectRep.MetricsData.Builder builder;
    private ArrowVectorWriter arrowVectorWriter;

    public CollectRep.MetricsData build() {
        builder.setData(ByteString.copyFrom(arrowVectorWriter.toByteArray()));
        return builder.build();
    }
}
