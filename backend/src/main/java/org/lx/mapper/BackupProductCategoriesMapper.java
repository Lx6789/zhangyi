package org.lx.mapper;

import org.apache.ibatis.annotations.Select;
import org.lx.pojo.BackupProductCategories;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 商品分类备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupProductCategoriesMapper extends BaseMapper<BackupProductCategories> {

    /**
     * 批量插入商品分类备份数据
     * @param categories 分类列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupProductCategories> categories);

    /**
     * 根据备份id查询数据
     * @param backupIdentifier
     * @return
     */
    @Select("SELECT * from backup_product_categories where backup_id = #{backupIdentifier}")
    List<BackupProductCategories> selectByBackupId(String backupIdentifier);
}