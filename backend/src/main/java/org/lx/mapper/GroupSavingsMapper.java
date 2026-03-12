package org.lx.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.lx.pojo.GroupSavings;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;
import java.util.Set;

/**
 * <p>
 * 多人存钱计划表 - 存储多人参与的存钱计划 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-04
 */
public interface GroupSavingsMapper extends BaseMapper<GroupSavings> {

    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    @Insert("INSERT INTO group_savings (name, reason, deadline, target_amount, current_amount, type, created_by, created_at, updated_at) " +
            "VALUES (#{name}, #{reason}, #{deadline}, #{targetAmount}, #{currentAmount}, #{type}, #{createdBy}, #{createdAt}, #{updatedAt})")
    int insert(GroupSavings groupSavings);

    /**
     * 查询计划列表（包括已逻辑删除的）
     */
    @InterceptorIgnore(tenantLine = "true", dynamicTableName = "true", blockAttack = "true", illegalSql = "true")
    @Select("<script>" +
            "SELECT * FROM group_savings WHERE id IN " +
            "<foreach item='id' collection='groupIds' open='(' separator=',' close=')'>" +
            "#{id}" +
            "</foreach>" +
            "</script>")
    List<GroupSavings> selectListWithDeleted(@Param("groupIds") Set<Integer> groupIds);
}
