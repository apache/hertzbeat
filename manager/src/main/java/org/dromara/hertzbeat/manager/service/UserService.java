package org.dromara.hertzbeat.manager.service;

import com.usthe.sureness.provider.SurenessAccount;
import org.dromara.hertzbeat.manager.pojo.dto.UserAccount;
import org.dromara.hertzbeat.manager.pojo.dto.UserToken;

import java.util.List;
import java.util.Map;
import java.util.Set;


public interface UserService {

    Long addUser(UserAccount account);

    void deleteUser(Long id);

    void deleteUser(String userName);

    UserAccount findUser(Long id);

    UserAccount findUser(String userName);

    void deleteUserTokens(Set<Long> ids);

    Map<String, String> issueAndSaveToken(UserAccount account, Long tokenExpireTime);

    Map<String, String> formToken(UserAccount account, String userId, Long tokenExpireTime);

    List<UserToken> findTokens(String identifier);
}
