package org.lx.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import org.apache.ibatis.annotations.*;
import org.lx.pojo.GroupSavings;
import org.lx.pojo.SavingsMembers;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;
import java.util.Set;

/**
 * <p>
 * 存钱计划成员表 - 存储多人存钱计划的成员信息 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Mapper
public interface SavingsMembersMapper extends BaseMapper<SavingsMembers> {

    /**
     * 批量插入成员
     * @param list 成员列表
     * @return 插入数量
     */
    int batchInsert(@Param("list") List<SavingsMembers> list);

    /**
     * 根据计划id与成员id判断是否加入对印的存钱计划
     * @param id
     * @param memberId
     * @return
     */
    @Select("select * from savings_members where group_saving_id = #{id} and user_id = #{memberId}")
    SavingsMembers selectByGroupIdAndMemberId(Integer id, Integer memberId);

    /**
     * 查询成员列表（包括已逻辑删除的）
     */
    @InterceptorIgnore(tenantLine = "true", dynamicTableName = "true", blockAttack = "true", illegalSql = "true")
    @Select("<script>" +
            "SELECT * FROM savings_members WHERE group_saving_id IN " +
            "<foreach item='id' collection='groupIds' open='(' separator=',' close=')'>" +
            "#{id}" +
            "</foreach>" +
            " ORDER BY joined_at ASC" +
            "</script>")
    List<SavingsMembers> selectListWithDeleted(@Param("groupIds") Set<Integer> groupIds);

    /**
     * 查询成员信息（包括已逻辑删除的）
     */
    @InterceptorIgnore(tenantLine = "true", dynamicTableName = "true", blockAttack = "true", illegalSql = "true")
    @Select("SELECT * FROM savings_members WHERE group_saving_id = #{planId} AND user_id = #{userId}")
    SavingsMembers selectMemberIncludeDeleted(@Param("planId") Integer planId, @Param("userId") Integer userId);

    @Select("SELECT * FROM savings_members WHERE group_saving_id = #{groupId}")
    List<SavingsMembers> selectAllMembersByGroupId(@Param("groupId") Integer groupId);

    /**
     * 强制更新成员（绕过逻辑删除）
     * @param savingsMembers 成员信息
     * @return 更新影响行数
     */
    @Update("UPDATE savings_members SET " +
            "member_name = #{memberName}, " +
            "amount = #{amount}, " +
            "is_owner = #{isOwner}, " +
            "update_at = #{updateAt}, " +
            "deleted = #{deleted}, " +
            "deleted_at = #{deletedAt} " +
            "WHERE id = #{id}")
    int forceUpdate(SavingsMembers savingsMembers);

    /**
     * 查询用户参与的所有存钱组（包括已退出的）
     */
    @Select("SELECT * FROM savings_members WHERE user_id = #{userId}")
    List<SavingsMembers> selectListWithDeletedByUserId(@Param("userId") Integer userId);
}
