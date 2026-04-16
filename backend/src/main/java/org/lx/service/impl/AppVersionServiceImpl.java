package org.lx.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.apache.ibatis.jdbc.Null;
import org.lx.common.RespBean;
import org.lx.common.RespCode;
import org.lx.mapper.AppVersionMapper;
import org.lx.pojo.AppVersion;
import org.lx.pojo.dto.AppVersionDTO;
import org.lx.service.AppVersionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.UUID;

/**
 * @Title: AppVersionServiceImpl
 * @Author: MrLu2
 * @Package: org.lx.service.impl
 * @Date: 2026/4/3 16:31
 * @Description: 版本跟新实现类
 */

@Slf4j
@Service
public class AppVersionServiceImpl extends ServiceImpl<AppVersionMapper, AppVersion> implements AppVersionService {

    @Value("${apk.storage.version.update-password}")
    private String updatePassword;

    @Value("${apk.storage.path}")
    private String path;

    @Value("${apk.storage.base-url}")
    private String baseUrl;

    @Autowired
    private AppVersionMapper appVersionMapper;

    /**
     * 跟新云端apk
     * @param appVersionDTO
     * @return
     */
    @Override
    public RespBean version(AppVersionDTO appVersionDTO, MultipartFile file) {
        //1.检查上传数据是否为空
        if (appVersionDTO == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "上传信息不能为空");
        }

        if (file == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "上传文件不能为空");
        }

        //2.判断更新密码是否正确
        if (appVersionDTO.getUpdatePassword() == null || appVersionDTO.getUpdatePassword().isEmpty() || !appVersionDTO.getUpdatePassword().equals(updatePassword)) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "更新密码错误");
        }

        //3.保存上传文件
        String downloadUrl;
        String md5;
        Long fileSize;

        try {
            // 3.1 计算文件MD5
            md5 = calculateMd5(file);

            // 3.2 获取文件大小
            fileSize = file.getSize();

            // 3.3 生成保存的文件名（防止重名）
            String originalFilename = file.getOriginalFilename();
            String fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String newFileName = UUID.randomUUID().toString().replace("-", "") + fileExtension;

            // 3.4 按日期创建子目录
            String datePath = new SimpleDateFormat("yyyy/MM/dd").format(new Date());
            File uploadDir = new File(path + File.separator + datePath);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            // 3.5 保存文件到服务器
            File targetFile = new File(uploadDir, newFileName);
            file.transferTo(targetFile);

            // 3.6 生成访问URL - 使用配置的 baseUrl，去掉末尾斜杠
            String cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
            downloadUrl = cleanBaseUrl + "/apk/" + datePath + "/" + newFileName;

            log.info("文件保存成功: {}", targetFile.getAbsolutePath());
            log.info("文件下载URL: {}", downloadUrl);
            log.info("文件MD5: {}", md5);

        } catch (IOException e) {
            log.error("文件保存失败", e);
            return RespBean.error(RespCode.DATA_NOT_FOUND, "文件上传失败：" + e.getMessage());
        }

        //4.将数据存到数据库中
        try {
            int newVersionCode = getNewVersion();

            if (newVersionCode == 0) {
                newVersionCode = 1;
            } else {
                newVersionCode = newVersionCode + 1;
            }

            // 如果前端指定了更大的版本号，使用前端的
            if (appVersionDTO.getVersionCode() != null && appVersionDTO.getVersionCode() > newVersionCode) {
                newVersionCode = appVersionDTO.getVersionCode();
            }

            AppVersion appVersion = new AppVersion();
            appVersion.setVersionCode(newVersionCode)
                    .setVersionName(appVersionDTO.getVersionName())
                    .setUpdateContent(appVersionDTO.getUpdateContent())
                    .setDownloadUrl(downloadUrl)
                    .setIsForceUpdate(appVersionDTO.getForceUpdate() != null ? appVersionDTO.getForceUpdate() : false)
                    .setMd5(md5)
                    .setFileSize(fileSize)
                    .setUpdateTime(new Date())
                    .setCreateTime(new Date());

            appVersionMapper.insert(appVersion);

            return RespBean.success(RespCode.SUCCESS, "版本保存成功");
        } catch (Exception e) {
            e.printStackTrace();
            return RespBean.error(RespCode.DATA_NOT_FOUND, e.getMessage());
        }
    }

    /**
     * 获取最新版本信息
     * @return
     */
    @Override
    public RespBean getLatestVersion() {
        try {
            // 查询最新版本的完整信息
            LambdaQueryWrapper<AppVersion> wrapper = new LambdaQueryWrapper<>();
            wrapper.orderByDesc(AppVersion::getVersionCode);
            wrapper.last("limit 1");
            AppVersion latestVersion = appVersionMapper.selectOne(wrapper);

            if (latestVersion == null) {
                return RespBean.error(RespCode.DATA_NOT_FOUND, "暂无版本信息");
            }

            // 返回完整的版本信息对象
            return RespBean.success(RespCode.SUCCESS, "查询成功", latestVersion);
        } catch (Exception e) {
            log.error("获取最新版本信息失败", e);
            return RespBean.error(RespCode.DATA_NOT_FOUND, "获取最新版本信息失败：" + e.getMessage());
        }
    }

    /**
     * 获取下载路径
     * @param versionId
     * @param response
     */
    @Override
    public void downloadApk(Integer versionId, HttpServletResponse response) {
        try {
            // 1. 查询版本信息
            AppVersion appVersion = appVersionMapper.selectById(versionId);
            if (appVersion == null) {
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                response.getWriter().write("版本不存在");
                return;
            }

            String downloadUrl = appVersion.getDownloadUrl();
            if (downloadUrl == null || downloadUrl.isEmpty()) {
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                response.getWriter().write("下载地址不存在");
                return;
            }

            // 2. 从 URL 中提取文件路径
            // 例如: http://111.229.172.186/apk/2026/04/16/xxx.apk
            String cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
            String relativePath = downloadUrl.replace(cleanBaseUrl, "");
            // relativePath = /apk/2026/04/16/xxx.apk

            String filePath = path + relativePath.replace("/apk", "");
            File file = new File(filePath);

            if (!file.exists()) {
                log.error("文件不存在: {}", filePath);
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                response.getWriter().write("文件不存在");
                return;
            }

            // 3. 设置响应头
            response.setContentType("application/vnd.android.package-archive");
            response.setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");
            response.setContentLengthLong(file.length());

            // 4. 写入文件流
            try (InputStream inputStream = new FileInputStream(file);
                 OutputStream outputStream = response.getOutputStream()) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                }
                outputStream.flush();
            }

            log.info("文件下载成功: {}", file.getName());

        } catch (Exception e) {
            log.error("下载APK失败", e);
            try {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                response.getWriter().write("下载失败：" + e.getMessage());
            } catch (IOException ex) {
                log.error("写入错误响应失败", ex);
            }
        }
    }

    /**
     * 计算文件的MD5值
     * @param file 上传的文件
     * @return MD5字符串
     */
    private String calculateMd5(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                md.update(buffer, 0, bytesRead);
            }
            byte[] digest = md.digest();
            // 转换为16进制字符串
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            log.error("MD5计算失败", e);
            throw new RuntimeException("MD5计算失败", e);
        }
    }

    /**
     * 获取最新版本号
     * @return
     */
    private int getNewVersion() {
        try {
            LambdaQueryWrapper<AppVersion> wrapper = new LambdaQueryWrapper<>();
            wrapper.orderByDesc(AppVersion::getVersionCode);
            wrapper.last("limit 1");
            AppVersion latestVersion = appVersionMapper.selectOne(wrapper);

            return latestVersion.getVersionCode() == null ? 0 : latestVersion.getVersionCode();
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }
}