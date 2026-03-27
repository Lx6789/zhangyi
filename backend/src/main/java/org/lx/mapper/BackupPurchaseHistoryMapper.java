package org.lx.mapper;

import org.apache.ibatis.annotations.Select;
import org.lx.pojo.BackupPurchaseHistory;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 采购历史备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupPurchaseHistoryMapper extends BaseMapper<BackupPurchaseHistory> {

    /**
     * 批量插入采购历史备份数据
     * @param history 采购历史列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupPurchaseHistory> history);

    /**
     * 根据备份id查询数据
     * @param backupIdentifier
     * @return
     */
    @Select("SELECT * from backup_purchase_history where backup_id = #{backupIdentifier}")
    List<BackupPurchaseHistory> selectByBackupId(String backupIdentifier);
}