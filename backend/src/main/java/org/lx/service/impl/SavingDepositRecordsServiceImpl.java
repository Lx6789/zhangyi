package org.lx.service.impl;

import org.lx.pojo.SavingDepositRecords;
import org.lx.mapper.SavingDepositRecordsMapper;
import org.lx.service.ISavingDepositRecordsService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 存钱记录表 - 存储每次存钱的详细历史记录 服务实现类
 * </p>
 *
 * @author lx
 * @since 2026-03-08
 */
@Service
public class SavingDepositRecordsServiceImpl extends ServiceImpl<SavingDepositRecordsMapper, SavingDepositRecords> implements ISavingDepositRecordsService {

}
