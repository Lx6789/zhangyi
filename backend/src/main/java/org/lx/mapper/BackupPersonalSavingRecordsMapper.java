package org.lx.mapper;

import org.lx.pojo.BackupPersonalSavingRecords;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 个人存钱记录备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupPersonalSavingRecordsMapper extends BaseMapper<BackupPersonalSavingRecords> {

    /**
     * 批量插入个人存钱记录备份数据
     * @param records 存钱记录列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupPersonalSavingRecords> records);
}