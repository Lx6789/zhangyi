import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * @Title: PasswordTest
 * @Author: MrLu2
 * @Date: 2026/1/15
 * @Description: 密码加密测试
 */
public class PasswordTest {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        // 测试1：加密
        String rawPassword = "123456";
        String encodedPassword = encoder.encode(rawPassword);
        System.out.println("原始密码: " + rawPassword);
        System.out.println("加密后: " + encodedPassword);

        // 测试2：验证
        boolean matches = encoder.matches(rawPassword, encodedPassword);
        System.out.println("验证结果: " + matches);

        // 测试3：多次加密结果不同（但都能验证成功）
        System.out.println("\n=== 多次加密对比 ===");
        for (int i = 0; i < 3; i++) {
            String encoded = encoder.encode(rawPassword);
            System.out.println("第" + (i+1) + "次加密: " + encoded);
            System.out.println("  验证: " + encoder.matches(rawPassword, encoded));
        }
    }
}