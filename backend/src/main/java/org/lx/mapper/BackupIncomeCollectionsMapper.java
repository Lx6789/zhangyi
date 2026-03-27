package org.lx.mapper;

import org.apache.ibatis.annotations.Select;
import org.lx.pojo.BackupIncomeCollections;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 收入收款记录备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupIncomeCollectionsMapper extends BaseMapper<BackupIncomeCollections> {

    /**
     * 批量插入收入收款记录备份数据
     * @param collections 收款记录列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupIncomeCollections> collections);

    /**
     * 根据备份id查询数据
     * @param backupIdentifier
     * @return
     */
    @Select("SELECT * from backup_income_collections where backup_id = #{backupIdentifier}")
    List<BackupIncomeCollections> selectByBackupId(String backupIdentifier);
}