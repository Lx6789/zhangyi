package org.lx.mapper;

import org.apache.ibatis.annotations.Select;
import org.lx.pojo.BackupCustomerRepayments;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 客户还款记录备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupCustomerRepaymentsMapper extends BaseMapper<BackupCustomerRepayments> {

    /**
     * 批量插入客户还款记录备份数据
     * @param repayments 还款记录列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupCustomerRepayments> repayments);

    /**
     * 根据备份id查询数据
     * @param backupIdentifier
     * @return
     */
    @Select("SELECT * from backup_customer_repayments where backup_id = #{backupIdentifier}")
    List<BackupCustomerRepayments> selectByBackupId(String backupIdentifier);
}