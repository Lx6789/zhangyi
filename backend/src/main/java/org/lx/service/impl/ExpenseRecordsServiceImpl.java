package org.lx.service.impl;

import org.lx.pojo.ExpenseRecords;
import org.lx.mapper.ExpenseRecordsMapper;
import org.lx.service.IExpenseRecordsService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 支出记录表 - 存储生意算盘中的支出记账记录 服务实现类
 * </p>
 *
 * @author lx
 * @since 2026-01-16
 */
@Service
public class ExpenseRecordsServiceImpl extends ServiceImpl<ExpenseRecordsMapper, ExpenseRecords> implements IExpenseRecordsService {

}
