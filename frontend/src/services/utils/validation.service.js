/**
 * 验证服务
 */
class ValidationService {

    /**
     * 验证邮箱或手机号格式
     */
    isValidEmailOrPhone(value) {
        const phoneRegex = /^1[3-9]\d{9}$/
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return phoneRegex.test(value) || emailRegex.test(value)
    }

    /**
     * 验证手机号格式
     */
    isValidPhone(phone) {
        return /^1[3-9]\d{9}$/.test(phone)
    }

    /**
     * 验证密码格式
     */
    isValidPassword(password) {
        return password.length >= 6 && password.length <= 20
    }

    /**
     * 检查密码是否匹配
     */
    isPasswordMatch(password, confirmPassword) {
        return password === confirmPassword
    }
}

export default new ValidationService()