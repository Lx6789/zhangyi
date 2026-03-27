package org.lx.mapper;

import org.lx.pojo.BackupPurchaseOrders;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <p>
 * 采购订单备份表 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
public interface BackupPurchaseOrdersMapper extends BaseMapper<BackupPurchaseOrders> {

    /**
     * 批量插入采购订单备份数据
     * @param orders 订单列表
     * @return 插入成功的条数
     */
    int insertBatch(@Param("list") List<BackupPurchaseOrders> orders);
}