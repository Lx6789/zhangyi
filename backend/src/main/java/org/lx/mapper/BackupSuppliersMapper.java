package org.lx.mapper;

import org.apache.ibatis.annotations.Select;
import org.lx.pojo.BackupSuppliers;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 供应商管理备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupSuppliersMapper extends BaseMapper<BackupSuppliers> {

    /**
     * 批量插入供应商备份数据
     * @param suppliers 供应商列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupSuppliers> suppliers);

    /**
     * 根据备份id查询数据
     * @param backupIdentifier
     * @return
     */
    @Select("SELECT * from backup_suppliers where backup_id = #{backupIdentifier}")
    List<BackupSuppliers> selectByBackupId(String backupIdentifier);
}