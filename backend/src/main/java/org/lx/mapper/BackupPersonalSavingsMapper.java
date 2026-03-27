package org.lx.mapper;

import org.lx.pojo.BackupPersonalSavings;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 个人存钱计划备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupPersonalSavingsMapper extends BaseMapper<BackupPersonalSavings> {

    /**
     * 批量插入个人存钱计划备份数据
     * @param savings 存钱计划列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupPersonalSavings> savings);
}