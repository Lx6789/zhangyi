package org.lx.config;

import com.google.code.kaptcha.impl.DefaultKaptcha;
import com.google.code.kaptcha.util.Config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Properties;

/**
* @Title: CaptchaConfig
* @Author: MrLu2
* @Package: org.lx.config
* @Date: 2026/1/14 18:22
* @Description: 验证码配置类
*/

@Configuration
public class CaptchaConfig {

    @Value("${kaptcha.border}")
    private String border;

    @Value("${kaptcha.border.color}")
    private String borderColor;

    @Value("${kaptcha.textproducer.font.color}")
    private String fontColor;

    @Value("${kaptcha.textproducer.font.size}")
    private String fontSize;

    @Value("${kaptcha.textproducer.char.length}")
    private String charLength;

    @Value("${kaptcha.image.width}")
    private String imageWidth;

    @Value("${kaptcha.image.height}")
    private String imageHeight;

    @Bean
    public DefaultKaptcha defaultKaptcha() {
        DefaultKaptcha defaultKaptcha = new DefaultKaptcha();
        Properties properties = new Properties();

        // 边框配置
        properties.setProperty("kaptcha.border", border);  // 使用配置值
        properties.setProperty("kaptcha.border.color", borderColor);
        properties.setProperty("kaptcha.border.thickness", "1");

        // Session配置
        properties.setProperty("kaptcha.session.key", "code");
        properties.setProperty("kaptcha.session.date", "codeDate"); // 添加时间戳

        // 干扰配置（增强安全性）
        properties.setProperty("kaptcha.noise.impl", "com.google.code.kaptcha.impl.DefaultNoise");
        properties.setProperty("kaptcha.noise.color", "black");

        // 背景配置
        properties.setProperty("kaptcha.background.clear.from", "white");
        properties.setProperty("kaptcha.background.clear.to", "white");

        // 文本配置
        properties.setProperty("kaptcha.textproducer.font.color", fontColor);
        properties.setProperty("kaptcha.textproducer.font.names", "宋体,楷体,微软雅黑");
        properties.setProperty("kaptcha.textproducer.font.size", fontSize);

        // 字符配置
        properties.setProperty("kaptcha.textproducer.char.length", charLength);
        properties.setProperty("kaptcha.textproducer.char.space", "4");
        // 去掉容易混淆的字符
        properties.setProperty("kaptcha.textproducer.char.string",
                "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz");

        // 图片配置
        properties.setProperty("kaptcha.image.width", imageWidth);
        properties.setProperty("kaptcha.image.height", imageHeight);

        // 使用干扰线
        properties.setProperty("kaptcha.obscurificator.impl",
                "com.google.code.kaptcha.impl.WaterRipple");

        Config config = new Config(properties);
        defaultKaptcha.setConfig(config);

        return defaultKaptcha;
    }
}
