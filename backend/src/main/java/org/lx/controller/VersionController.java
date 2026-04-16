package org.lx.controller;

import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.lx.common.RespBean;
import org.lx.pojo.dto.AppVersionDTO;
import org.lx.service.AppVersionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletResponse;

/**
 * @Title: VersionController
 * @Author: MrLu2
 * @Package: org.lx.controller
 * @Date: 2026/4/3 16:33
 * @Description: 版本更新接口
 */

@Slf4j
@RestController
@RequestMapping("/version")
@Api(tags = "App版本管理接口")
public class VersionController {

    @Autowired
    private AppVersionService appVersionService;

    @ApiOperation(value = "更新云端apk")
    @PostMapping("/update")
    public RespBean updateVersion(AppVersionDTO appVersionDTO, @RequestParam("file") MultipartFile file) {
        return appVersionService.version(appVersionDTO, file);
    }

    @ApiOperation(value = "获取最新版本信息")
    @GetMapping("/latest")
    public RespBean getLatestVersion() {
        return appVersionService.getLatestVersion();
    }

    @ApiOperation(value = "前端下载接口")
    @GetMapping("/download/{versionId}")
    public void downloadApk(@PathVariable("versionId") Integer versionId, HttpServletResponse response) {
        appVersionService.downloadApk(versionId, response);
    }
}