package org.lx.service.impl;

import org.lx.pojo.ChartData;
import org.lx.mapper.ChartDataMapper;
import org.lx.service.IChartDataService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 图表数据表 - 存储图表分析的数据快照 服务实现类
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Service
public class ChartDataServiceImpl extends ServiceImpl<ChartDataMapper, ChartData> implements IChartDataService {

}
