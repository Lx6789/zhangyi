package org.lx.mapper;

import org.lx.pojo.BackupIncomeRecords;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 收入记录备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupIncomeRecordsMapper extends BaseMapper<BackupIncomeRecords> {

    /**
     * 批量插入收入记录备份数据
     * @param records 记录列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupIncomeRecords> records);
}