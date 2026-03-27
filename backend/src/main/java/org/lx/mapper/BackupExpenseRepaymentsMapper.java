package org.lx.mapper;

import org.lx.pojo.BackupExpenseRepayments;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 支出还款记录备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupExpenseRepaymentsMapper extends BaseMapper<BackupExpenseRepayments> {

    /**
     * 批量插入支出还款记录备份数据
     * @param repayments 还款记录列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupExpenseRepayments> repayments);
}