package org.apache.hertzbeat.alert.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class VolcEngineExternEventAlert {
    @JsonProperty("Type")
    private String type;

    @JsonProperty("AccountId")
    private String accountId;

    @JsonProperty("Source")
    private String source;

    @JsonProperty("ProjectName")
    private String projectName;

    @JsonProperty("Id")
    private String id;

    @JsonProperty("EventType")
    private String eventType;

    @JsonProperty("DescriptionCN")
    private String descriptionCN;

    @JsonProperty("HappenedAt")
    private Long happenedAt;

    @JsonProperty("Region")
    private String region;

    @JsonProperty("Details")
    private EventDetails details;

    @JsonProperty("Rules")
    private List<EventRule> rules;

    @Data
    public static class EventDetails {
        @JsonProperty("specversion")
        private String specVersion;

        @JsonProperty("id")
        private String id;

        @JsonProperty("source")
        private String source;

        @JsonProperty("type")
        private String type;

        @JsonProperty("volcpublishtime")
        private String volcPublishTime;

        @JsonProperty("volcregion")
        private String volcRegion;

        @JsonProperty("volcaccountid")
        private String volcAccountId;

        @JsonProperty("volceventbusname")
        private String volcEventBusName;

        @JsonProperty("volcresourcename")
        private String volcResourceName;

        @JsonProperty("subject")
        private String subject;

        @JsonProperty("time")
        private String time;
    }

    @Data
    public static class EventRule {
        @JsonProperty("RuleId")
        private String ruleId;

        @JsonProperty("RuleName")
        private String ruleName;

        @JsonProperty("Level")
        private String level;
    }
}
