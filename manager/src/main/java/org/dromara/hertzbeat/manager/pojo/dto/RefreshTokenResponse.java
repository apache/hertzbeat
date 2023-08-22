package org.dromara.hertzbeat.manager.pojo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


/**
 * Refresh Token Response
 * @author Carpe-Wang
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "刷新令牌响应")
public class RefreshTokenResponse {
    @Schema(title = "Access Token")
    private String token;

    @Schema(title = "Refresh Token")
    private String refreshToken;
}
