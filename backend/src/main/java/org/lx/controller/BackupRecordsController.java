package org.lx.controller;


import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.lx.common.RespBean;
import org.lx.pojo.BackupRecords;
import org.lx.pojo.dto.BackupDTO;
import org.lx.service.IBackupRecordsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RestController;

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

}
