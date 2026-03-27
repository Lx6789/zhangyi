package org.lx.mapper;

import org.apache.ibatis.annotations.Select;
import org.lx.pojo.BackupProducts;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 商品管理备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupProductsMapper extends BaseMapper<BackupProducts> {

    /**
     * 批量插入商品备份数据
     * @param products 商品列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupProducts> products);

    /**
     * 根据备份id查询数据
     * @param backupIdentifier
     * @return
     */
    @Select("SELECT * from backup_products where backup_id = #{backupIdentifier}")
    List<BackupProducts> selectByBackupId(String backupIdentifier);
}