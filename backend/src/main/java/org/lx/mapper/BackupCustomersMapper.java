package org.lx.mapper;

import org.apache.ibatis.annotations.Select;
import org.lx.pojo.BackupCustomers;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 客户管理备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupCustomersMapper extends BaseMapper<BackupCustomers> {

    /**
     * 批量插入客户备份数据
     * @param customers 客户列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupCustomers> customers);

    /**
     * 根据备份id查询数据
     * @param backupIdentifier
     * @return
     */
    @Select("SELECT * from backup_customers where backup_id = #{backupIdentifier}")
    List<BackupCustomers> selectByBackupId(String backupIdentifier);
}