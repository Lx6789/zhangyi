package org.lx.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.lx.mapper.SavingDepositRecordsMapper;
import org.lx.pojo.SavingDepositRecords;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * @Title: DepositRecordCleanupTask
 * @Author: MrLu2
 * @Package: org.lx.config
 * @Date: 2026/3/9 15:53
 * @Description: 软删除定时任务类
 */

@Slf4j
@Component
public class DepositRecordCleanupTask {

    @Autowired
    private SavingDepositRecordsMapper depositRecordMapper;

    /**
     * 每天凌晨3点执行软删除
     */
    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void softDeleteOldRecords() {
        log.info("===== 开始软删除30天前的存钱记录 =====");

        try {
            LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

            // 这里用的是 delete 方法，但因为加了 @TableLogic，实际执行的是 UPDATE
            int deleted = depositRecordMapper.delete(
                new LambdaQueryWrapper<SavingDepositRecords>()
                            .lt(SavingDepositRecords::getDepositTime, thirtyDaysAgo)
            );

            log.info("成功软删除 {} 条记录", deleted);

        } catch (Exception e) {
            log.error("软删除失败", e);
        }

        log.info("===== 软删除任务完成 =====");
    }

    /**
     * 每月1号凌晨4点彻底删除（物理删除）90天前的已删数据
     */
    @Scheduled(cron = "0 0 4 1 * ?")
    @Transactional
    public void physicalDeleteOldSoftDeleted() {
        log.info("===== 开始物理删除90天前的已删记录 =====");

        try {
            LocalDateTime ninetyDaysAgo = LocalDateTime.now().minusDays(90);

            // 这里要物理删除，所以用自定义SQL或wrapper
            // 注意：因为加了@TableLogic，delete方法还是UPDATE，所以要自己写SQL
            int deleted = depositRecordMapper.physicalDeleteOldRecords(ninetyDaysAgo);

            log.info("成功物理删除 {} 条记录", deleted);

        } catch (Exception e) {
            log.error("物理删除失败", e);
        }

        log.info("===== 物理删除任务完成 =====");
    }
}
