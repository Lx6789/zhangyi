package org.lx.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.lx.pojo.ChartData;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

/**
 * <p>
 * 图表数据表 - 存储图表分析的数据快照 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Mapper
public interface ChartDataMapper extends BaseMapper<ChartData> {

}
