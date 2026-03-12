package org.lx.service.impl;

import org.lx.mapper.IncomeRecordsMapper;
import org.lx.pojo.IncomeRecords;
import org.lx.service.IIncomeRecordsService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 收入记录表 - 存储生意算盘中的收入记账记录 服务实现类
 * </p>
 *
 * @author lx
 * @since 2026-01-16
 */
@Service
public class IncomeRecordsServiceImpl extends ServiceImpl<IncomeRecordsMapper, IncomeRecords> implements IIncomeRecordsService {

}
