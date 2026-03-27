package org.lx.mapper;

import org.apache.ibatis.annotations.Select;
import org.lx.pojo.BackupInventory;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 库存管理备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupInventoryMapper extends BaseMapper<BackupInventory> {

    /**
     * 批量插入库存备份数据
     * @param inventory 库存列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupInventory> inventory);

    /**
     * 根据备份id查询数据
     * @param backupIdentifier
     * @return
     */
    @Select("SELECT * from backup_inventory where backup_id = #{backupIdentifier}")
    List<BackupInventory> selectByBackupId(String backupIdentifier);
}