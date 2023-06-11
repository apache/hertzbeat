package org.dromara.hertzbeat.manager.service;

/**
 * @author:Li Jinming
 * @Description: 用户信息和token管理 service
 * @date:2023-06-07
 */
import org.dromara.hertzbeat.manager.pojo.dto.UserAccount;
import org.dromara.hertzbeat.manager.pojo.dto.UserToken;

import java.util.List;
import java.util.Map;
import java.util.Set;


public interface UserService {

    /**
     *  存入一个新的user account
     * @param account
     * @return account ID
     */
    Long addUser(UserAccount account);

    /**
     *  根据 userId删除一个user
     * @param id user id
     */
    void deleteUser(Long id);

    /**
     * 根据 identifier 删除一个user
     * @param userName user identifier
     */
    void deleteUser(String userName);

    /**
     * 根据 userId查找一个user
     * @param id  userId
     * @return user account info
     */
    UserAccount findUser(Long id);

    /**
     * 根据 identifier查找一个user account info
     * @param userName user identifier
     * @return user account info
     */
    UserAccount findUser(String userName);

    /**
     * 根据 id list删除JWT token
     * @param ids user id list
     */
    void deleteUserTokens(Set<Long> ids);

    /**
     * 生成新的jwt token并存入数据库
     * @param account user account info
     * @param tokenExpireTime token expire time
     * @return
     */
    Map<String, String> issueAndSaveToken(UserAccount account, Long tokenExpireTime);

    /**
     * 用户登录时生成新的token
     * @param account user account info
     * @param tokenExpireTime token expire time
     * @return token and refresh token and tokenId
     */
    Map<String, String> formToken(UserAccount account, Long tokenExpireTime);

    /**
     * 根据用户identifier查找所生成的tokens
     * @param identifier user identifier
     * @return user tokens
     */
    List<UserToken> findTokens(String identifier);
}
