package org.dromara.hertzbeat.manager.dao;

/**
 * @author:Li Jinming
 * @Description: 用户JWT token DAO
 * @date:2023-06-07
 */
import org.dromara.hertzbeat.manager.pojo.dto.UserToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Set;

public interface UserTokenDao extends JpaRepository<UserToken, Long>, JpaSpecificationExecutor<UserToken> {
    /**
     * delete UserTokens by  id
     *
     * @param ids id list
     */
    void deleteUserTokensByIdIn(Set<Long> ids);

    /**
     * find UserTokens by  id
     *
     * @param ids id list
     * @return UserTokens list
     */
    List<UserToken> findByIdIn(Set<Long> ids);


    /**
     * find UserTokens by account identifier
     *
     * @param identifier
     * @return UserTokens list
     */
    List<UserToken> findUserTokenByAccountIdentifier(String identifier);
}
