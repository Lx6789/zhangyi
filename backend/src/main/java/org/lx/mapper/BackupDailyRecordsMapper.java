package org.lx.mapper;

import org.lx.pojo.BackupDailyRecords;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 个人记账备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupDailyRecordsMapper extends BaseMapper<BackupDailyRecords> {

    /**
     * 批量插入个人记账备份数据
     * @param records 记录列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupDailyRecords> records);
}