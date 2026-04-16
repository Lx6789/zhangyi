package org.lx.service;

import com.baomidou.mybatisplus.extension.service.IService;
import org.lx.common.RespBean;
import org.lx.pojo.dto.AppVersionDTO;
import org.lx.pojo.AppVersion;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletResponse;

public interface AppVersionService extends IService<AppVersion> {

    /**
     * 跟新云端apk
     * @param appVersionDTO
     * @return
     */
    RespBean version(AppVersionDTO appVersionDTO, MultipartFile file);

    /**
     * 获取最新版本信息
     * @return
     */
    RespBean getLatestVersion();

    /**
     * 前端下载接口
     * @param versionId
     * @param response
     */
    void downloadApk(Integer versionId, HttpServletResponse response);
}