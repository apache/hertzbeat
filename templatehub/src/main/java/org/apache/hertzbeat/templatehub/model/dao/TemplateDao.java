package org.apache.hertzbeat.templatehub.model.dao;

import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface TemplateDao extends JpaRepository<Template, Integer> {

    @Query(value = "select id from template where name= ? and `user`= ?",nativeQuery=true)
    int queryId(String name, int user);

    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE template set `latest` = ? where `id` = ?",nativeQuery=true)
    int updateTemplate(int latest,int id);

    @Query(value = "select COUNT(*) from template where `name` = ? and `user` = ?",nativeQuery=true)
    int queryCountByNameAndUser(String name,int user);

    @Query(value = "select * from template where `user` = ? and `is_del` = ?",nativeQuery=true)
    List<Template> queryByUserId(int user, int isDel);

    @Query(value = "select * from template where `is_del` = ?",nativeQuery=true)
    List<Template> queryAllByIsDel(int isDel);

    Template findTemplateById(int id);
}
