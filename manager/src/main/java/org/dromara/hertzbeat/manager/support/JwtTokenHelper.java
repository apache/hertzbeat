package org.dromara.hertzbeat.manager.support;


import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.util.JsonWebTokenUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * @author:Li Jinming
 * @Description: sureness's JsonWebTokenUtil 's delegator
 * @date:2023-06-10
 */


public class JwtTokenHelper {
    public static Map<String, String> issueJwtToken(SurenessAccount account, String userId, Long tokenExpireTime) {
        // Get the roles the user has - rbac
        List<String> roles = account.getOwnRoles();
        // Issue TOKEN      签发TOKEN
        String issueToken = JsonWebTokenUtil.issueJwt(userId, tokenExpireTime, roles);
        Map<String, Object> customClaimMap = new HashMap<>(1);
        customClaimMap.put("refresh", true);
        String issueRefresh = JsonWebTokenUtil.issueJwt(userId, tokenExpireTime << 5, customClaimMap);
        Map<String, String> resp = new HashMap<>(3);
        resp.put("token", issueToken);
        resp.put("refreshToken", issueRefresh);
        return resp;
    }

    public static Claims parseJwt(String jwt) throws ExpiredJwtException, UnsupportedJwtException, MalformedJwtException, SignatureException, IllegalArgumentException {
        return JsonWebTokenUtil.parseJwt(jwt);
    }
}
