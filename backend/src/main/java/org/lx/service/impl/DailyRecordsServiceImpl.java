package org.lx.service.impl;

import org.lx.common.RespBean;
import org.lx.pojo.DailyRecords;
import org.lx.mapper.DailyRecordsMapper;
import org.lx.service.IDailyRecordsService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpServletRequest;

/**
 * <p>
 * 日常记账表 服务实现类
 * </p>
 *
 * @author lx
 * @since 2026-01-16
 */
@Service
public class DailyRecordsServiceImpl extends ServiceImpl<DailyRecordsMapper, DailyRecords> implements IDailyRecordsService {

    /**
     * 获取今日数据
     * @param request
     * @return
     */
    @Override
    public RespBean getTodaySummary(HttpServletRequest request) {
        return null;
    }
}
