// services/api/auth.service.js
import http from '@/services/utils/http-interceptor.js';  // http 是一个对象，包含 get/post 等方法
import authApi from "@/api";

class AuthApiService {
    // 通用请求方法
    request(apiFunction, data = null) {
        // 检查 apiFunction 是否为函数
        if (typeof apiFunction !== 'function') {
            console.error('apiFunction is not a function:', apiFunction);
            return Promise.reject(new Error('API function is not a function'));
        }

        // 获取API配置
        const apiConfig = data ? apiFunction(data) : apiFunction();
        console.log('请求配置:', apiConfig);

        // 修复：http 是对象，不是函数，不能直接调用
        // 根据 method 使用对应的 http 方法
        switch (apiConfig.method.toLowerCase()) {
            case 'get':
                return http.get(apiConfig.url, apiConfig.params);
            case 'post':
                return http.post(apiConfig.url, apiConfig.data);
            case 'put':
                return http.put(apiConfig.url, apiConfig.data);
            case 'delete':
                return http.delete(apiConfig.url, apiConfig.params);
            case 'patch':
                return http.patch(apiConfig.url, apiConfig.data);
            default:
                return http.post(apiConfig.url, apiConfig.data);
        }
    }

    // 登录
    login(data) {
        return this.request(authApi.login, data);
    }

    // 注册
    register(data) {
        return this.request(authApi.register, data);
    }

    // 生成验证码
    generateCaptcha() {
        return this.request(authApi.generateCaptcha);
    }

    // 验证验证码
    verifyCaptcha(data) {
        return this.request(authApi.verifyCaptcha, data);
    }

    // 退出登录
    logout() {
        return this.request(authApi.logout);
    }

    // 获取用户信息
    getUserInfo() {
        return this.request(authApi.getUserInfo);
    }

    // 获取安全问题
    getSecurityQuestion(data) {
        return this.request(authApi.getSecurityQuestion, data);
    }

    // 验证安全问题答案
    verifySecurityAnswer(data) {
        return this.request(authApi.verifySecurityAnswer, data);
    }

    // 重置密码
    resetPassword(data) {
        return this.request(authApi.resetPassword, data);
    }
}

export default new AuthApiService();