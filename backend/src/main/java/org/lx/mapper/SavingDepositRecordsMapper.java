// SavingDepositRecordsMapper.java
package org.lx.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import org.lx.pojo.SavingDepositRecords;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.time.LocalDateTime;
import java.util.List;

public interface SavingDepositRecordsMapper extends BaseMapper<SavingDepositRecords> {

    /**
     * 物理删除旧记录（绕过逻辑删除）
     */
    @Update("DELETE FROM saving_deposit_records WHERE deleted = 1 AND create_time < #{cutoffTime}")
    int physicalDeleteOldRecords(@Param("cutoffTime") LocalDateTime ninetyDaysAgo);

    /**
     * 查询所有存钱记录（包括已逻辑删除的）
     */
    @InterceptorIgnore(tenantLine = "true", dynamicTableName = "true", blockAttack = "true", illegalSql = "true")
    @Select("SELECT * FROM saving_deposit_records WHERE group_saving_id = #{planId} AND member_id = #{memberId} ORDER BY deposit_time DESC")
    List<SavingDepositRecords> selectAllByMemberId(@Param("planId") Integer planId, @Param("memberId") Integer memberId);

    /**
     * 分页查询存钱记录（包含软删除）- 修复SQL语法错误
     * @param page 分页参数
     * @param planId 计划ID
     * @param memberId 成员ID（可选）
     * @param startTime 开始时间（可选）
     * @param endTime 结束时间（可选）
     * @return
     */
    @Select({
            "<script>",
            "SELECT * FROM saving_deposit_records",
            "WHERE group_saving_id = #{planId}",

            // 🔴 修复：正确的条件判断，不要加多余的 AND
            "<if test='memberId != null'>",
            " AND member_id = #{memberId}",
            "</if>",

            "<if test='startTime != null and startTime != \"\"'>",
            " AND deposit_time >= #{startTime}",
            "</if>",

            "<if test='endTime != null and endTime != \"\"'>",
            " AND deposit_time &lt;= #{endTime}",
            "</if>",

            "ORDER BY deposit_time DESC",
            "</script>"
    })
    Page<SavingDepositRecords> selectPageIncludeDeletedSimple(
            @Param("page") Page<SavingDepositRecords> page,
            @Param("planId") Integer planId,
            @Param("memberId") Integer memberId,
            @Param("startTime") String startTime,
            @Param("endTime") String endTime
    );
}