package org.apache.hertzbeat.templatehub.model.DAO;

import org.apache.hertzbeat.templatehub.model.DO.AuthResourceDO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * @author tomsun28
 * @date 16:40 2019-07-27
 */
public interface AuthResourceDao extends JpaRepository<AuthResourceDO, Long> {

    /**
     * Get uri resource and resource-role relationship chain, eg: /api/v2/host===post===[role2,role3,role4]
     * @return resource-role chain set
     */
    @Query(value = "SELECT  CONCAT(LOWER(res.uri),\"===\",LOWER(res.method),\"===[\",IFNULL(GROUP_CONCAT(DISTINCT role.code),\"\"),\"]\") " +
            "FROM auth_resource res " +
            "LEFT JOIN auth_role_resource_bind bind on res.id = bind.resource_id " +
            "LEFT JOIN auth_role role on role.id = bind.role_id " +
            "where res.status = 1 " +
            "group by res.id", nativeQuery = true)
    Optional<List<String>> getEnableResourcePathRoleData();



    /**
     * Get disabled uri resources eg: /api/v2/host===post
     * @return resouce set
     */
    @Query("select CONCAT(LOWER(resource.uri),'===', resource.method) " +
            "from AuthResourceDO resource where resource.status = 9 order by resource.id")
    Optional<List<String>> getDisableResourcePathData();

    /**
     * Get the available API resources owned by the current role in the form of paging
     * @param roleId roleId
     * @param request page
     * @return api resource list
     */
    @Query("select distinct resource from AuthResourceDO resource " +
            "left join AuthRoleResourceBindDO bind on bind.resourceId = resource.id " +
            "where bind.roleId = :roleId " +
            "order by resource.id asc")
    Page<AuthResourceDO> findRoleOwnResource(@Param("roleId") Long roleId, Pageable request);

    /**
     * Get the available API resources owned by the current role in the form of paging
     * @param roleId roleId
     * @param request page
     * @return api resource list
     */
    @Query("select distinct resource from AuthResourceDO resource " +
            " where resource.id not in " +
            "(select distinct bind.resourceId from AuthRoleResourceBindDO bind where bind.roleId = :roleId) " +
            "order by resource.id asc ")
    Page<AuthResourceDO> findRoleNotOwnResource(@Param("roleId") Long roleId, Pageable request);
}
