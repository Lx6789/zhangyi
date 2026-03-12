package org.lx.config;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * @Title: UserIdentifierDetectorUtil
 * @Author: MrLu2
 * @Package: org.lx.config
 * @Date: 2026/1/15 23:41
 * @Description: 用户标识符检测器
 */

@Component
public class UserIdentifierDetectorUtil {

    /**
     * 判断是否为手机号
     * @param str
     * @return
     */
    public static boolean isPhoneNumber(String str) {
        if (str == null || str.length() != 11) {
            return false;
        }

        // 1. 验证是否全为数字
        if (!str.matches("\\d+")) {
            return false;
        }

        // 2. 验证手机号格式（简单版本）
        // 中国手机号: 13x, 14x, 15x, 16x, 17x, 18x, 19x 开头
        String regex = "^1[3-9]\\d{9}$";
        return Pattern.matches(regex, str);
    }

    /**
     * 判断是否为邮箱
     * @param str
     * @return
     */
    public static boolean isEmail(String str) {
        if (str == null || str.length() < 5) { // a@b.c 最短5位
            return false;
        }

        // 邮箱正则表达式（相对严格的版本）
        String emailRegex = "^[a-zA-Z0-9_!#$%&'*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";
        return Pattern.matches(emailRegex, str);
    }
}
