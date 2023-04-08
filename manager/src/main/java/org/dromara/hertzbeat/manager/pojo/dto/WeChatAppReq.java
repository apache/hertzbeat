package org.dromara.hertzbeat.manager.pojo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WeChatAppReq
 * @author hdd
 * @create 2023/04/05
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class WeChatAppReq {

    @JsonProperty(value = "errcode")
    private Integer errCode;

    @JsonProperty(value = "errmsg")
    private String errMsg;

    @JsonProperty(value = "access_token")
    private String accessToken;
}
