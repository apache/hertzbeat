package org.dromara.hertzbeat.manager.service;

import org.dromara.hertzbeat.manager.pojo.dto.UserAccount;

import java.util.List;



public interface UserService {

    Long addUser(UserAccount account);

    void deleteUser(Long id);

    void deleteUser(String userName);

    List<UserAccount> findUser(Long id);

    List<UserAccount> findUser(String userName);
}
