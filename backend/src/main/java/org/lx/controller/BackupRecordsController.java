package org.lx.controller;


import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiModelProperty;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.lx.common.RespBean;
import org.lx.common.RespCode;
import org.lx.pojo.BackupRecords;
import org.lx.pojo.dto.BackupDTO;
import org.lx.service.IBackupRecordsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.security.Principal;
import java.util.List;

/**
 * <p>
 * 备份记录表 前端控制器
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */

@Slf4j
@Api(tags = "备份记录")
@RestController
@RequestMapping("/backup")
public class BackupRecordsController {

    @Autowired
    private IBackupRecordsService backupRecordsService;

    @ApiOperation(value = "上传备份数据")
    @PostMapping("/upload")
    public RespBean upload(@RequestBody BackupDTO backupDTO) {
        return backupRecordsService.upload(backupDTO);
    }

    @ApiModelProperty(value = "获取备份列表信息")
    @GetMapping("/list")
    public RespBean list(@RequestParam Integer userId) {
        try {
            LambdaQueryWrapper<BackupRecords> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(BackupRecords::getUserId, userId);
            List<BackupRecords> list = backupRecordsService.list(queryWrapper);

            return RespBean.success(RespCode.SUCCESS, "查询成功", list);
        } catch (Exception e) {
            e.printStackTrace();
            return RespBean.error(RespCode.DATA_NOT_FOUND, "获取备份列表失败");
        }
    }

    @ApiOperation(value = "获取用户备份数量")
    @GetMapping("/count")
    public RespBean getBackupCount(@RequestParam Long userId) {
        try {
            LambdaQueryWrapper<BackupRecords> wrapper = new LambdaQueryWrapper<>();
            wrapper.eq(BackupRecords::getUserId, userId)
                    .eq(BackupRecords::getStatus, 1);
            long count = backupRecordsService.count(wrapper);
            return RespBean.success(RespCode.SUCCESS, "获取成功", count);
        } catch (Exception e) {
            log.error("获取备份数量失败", e);
            return RespBean.error(RespCode.DATA_NOT_FOUND, "获取备份数量失败");
        }
    }
}
