package org.lx.service;

import org.lx.common.RespBean;
import org.lx.pojo.BackupRecords;
import com.baomidou.mybatisplus.extension.service.IService;
import org.lx.pojo.dto.BackupDTO;

/**
 * <p>
 * 备份记录表 服务类
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface IBackupRecordsService extends IService<BackupRecords> {

    /**
     * 上传备份数据
     * @param backupDTO
     * @return
     */
    RespBean upload(BackupDTO backupDTO);

    /**
     * 删除指定备份数据
     * @param backupId
     * @return
     */
    RespBean delete(Integer backupId);
}
