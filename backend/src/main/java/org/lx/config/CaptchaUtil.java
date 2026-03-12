package org.lx.config;

import com.google.code.kaptcha.impl.DefaultKaptcha;
import org.lx.common.RespBean;
import org.lx.common.RespCode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.Base64Utils;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * @Title: CaptchaUtil
 * @Author: MrLu2
 * @Package: org.lx.config
 * @Date: 2026/1/14 18:27
 * @Description: 验证码工具类
 */

@Component
public class CaptchaUtil {

    @Autowired
    private DefaultKaptcha defaultKaptcha;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Value("${captcha.expire-time}")
    private int captchaExpireTime;

    /**
     * 生成验证码图片（Base64格式）
     */
    public RespBean generateCaptcha() {
        // 生成验证码文本
        String code = defaultKaptcha.createText();

        // 生成验证码图片
        BufferedImage image = defaultKaptcha.createImage(code);

        // 转换为Base64
        String base64Image;
        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            ImageIO.write(image, "jpg", os);
            base64Image = "data:image/jpeg;base64," +
                    Base64Utils.encodeToString(os.toByteArray());
        } catch (Exception e) {
            return RespBean.error(RespCode.CAPTCHA_GENERATE_FAILED, "验证码生成失败");
        }

        // 生成验证码ID（用于后续验证）
        String captchaKey = UUID.randomUUID().toString();

        // 存储到Redis，设置过期时间
        String redisKey = "captcha:" + captchaKey;
        redisTemplate.opsForValue().set(redisKey, code, captchaExpireTime, TimeUnit.SECONDS);

        // 返回结果
        Map<String, String> result = new HashMap<>();
        result.put("captchaKey", captchaKey);
        result.put("image", base64Image);

        return RespBean.success(RespCode.SUCCESS, "验证码生成成功", result);
    }

    /**
     * 验证验证码
     */
    public boolean validateCaptcha(String captchaId, String userInputCode) {
        if (captchaId == null || userInputCode == null) {
            return false;
        }

        String redisKey = "captcha:" + captchaId;
        String correctCode = (String) redisTemplate.opsForValue().get(redisKey);

        if (correctCode == null) {
            // 验证码已过期
            return false;
        }

        // 忽略大小写验证
        boolean isValid = correctCode.equalsIgnoreCase(userInputCode);

        // 验证后删除，防止重复使用
        if (isValid) {
            // 存储已验证状态，防止重复使用
            String verifiedKey = "captcha_verified:" + captchaId;
            redisTemplate.opsForValue().set(verifiedKey, "1", captchaExpireTime, TimeUnit.SECONDS);
        }

        return isValid;
    }

    /**
     * 检查验证码是否已验证过
     */
    public boolean isCaptchaVerified(String captchaId) {
        if (captchaId == null) {
            return false;
        }

        String verifiedKey = "captcha_verified:" + captchaId;
        return redisTemplate.hasKey(verifiedKey);
    }

    /**
     * 清理已验证的验证码
     */
    public void cleanVerifiedCaptcha(String captchaId) {
        if (captchaId != null) {
            String verifiedKey = "captcha_verified:" + captchaId;
            redisTemplate.delete(verifiedKey);
        }
    }
}
