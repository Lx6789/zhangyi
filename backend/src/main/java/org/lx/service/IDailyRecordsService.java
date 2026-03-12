package org.lx.service;

import org.lx.common.RespBean;
import org.lx.pojo.DailyRecords;
import com.baomidou.mybatisplus.extension.service.IService;

import javax.servlet.http.HttpServletRequest;

/**
 * <p>
 * 日常记账表 服务类
 * </p>
 *
 * @author lx
 * @since 2026-01-16
 */
public interface IDailyRecordsService extends IService<DailyRecords> {

    /**
     * 获取今日数据
     * @param request
     * @return
     */
    RespBean getTodaySummary(HttpServletRequest request);
}
