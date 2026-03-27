package org.lx.mapper;

import org.lx.pojo.BackupRecords;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 备份记录表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupRecordsMapper extends BaseMapper<BackupRecords> {

    /**
     * 批量插入备份记录
     * @param records 备份记录列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupRecords> records);
}