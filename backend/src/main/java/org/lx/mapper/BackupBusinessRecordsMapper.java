package org.lx.mapper;

import org.lx.pojo.BackupBusinessRecords;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 生意记账备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupBusinessRecordsMapper extends BaseMapper<BackupBusinessRecords> {

    /**
     * 批量插入生意记账备份数据
     * @param records 记录列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupBusinessRecords> records);
}