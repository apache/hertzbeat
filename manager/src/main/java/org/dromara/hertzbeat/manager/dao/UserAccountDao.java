package org.dromara.hertzbeat.manager.dao;


import org.dromara.hertzbeat.manager.pojo.dto.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Set;

public interface UserAccountDao extends JpaRepository<UserAccount, Long>, JpaSpecificationExecutor<UserAccount> {

    /**
     * delete accounts by account id
     *
     * @param ids id list
     */
    void deleteAllByIdIn(Set<Long> ids);

    /**
     * find account by account id
     *
     * @param ids id list
     * @return account list
     */
    List<UserAccount> findByIdIn(Set<Long> ids);


    /**
     * delete user account by user name
     *
     * @param userName
     */
    void deleteUserAccountsByUserNameEquals(String userName);

    /**
     * find user account by user name
     *
     * @param userName
     * @return account list
     */
    List<UserAccount> findUserAccountsByUserNameEquals(String userName);

}
