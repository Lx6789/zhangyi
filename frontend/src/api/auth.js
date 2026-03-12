/**
 * 认证相关接口定义
 * 只包含API调用函数，不包含业务逻辑
 */
import { API } from './constants';

export const login = (data) => {
    return {
        url: API.AUTH.LOGIN,
        method: 'post',
        data
    }
}

export const register = (data) => {
    return {
        url: API.AUTH.REGISTER,
        method: 'post',
        data
    }
}

export const generateCaptcha = () => {
    return {
        url: API.AUTH.GENERATE_CAPTCHA,
        method: 'get'
    }
}

export const verifyCaptcha = (data) => {
    return {
        url: API.AUTH.VERIFY_CAPTCHA,
        method: 'post',
        data
    }
}

export const logout = () => {
    return {
        url: API.AUTH.LOGOUT,
        method: 'post'
    }
}

export const getUserInfo = () => {
    return {
        url: API.AUTH.USER_INFO,
        method: 'get'
    }
}

// 忘记密码相关接口
export const getSecurityQuestion = (data) => {
    return {
        url: API.AUTH.FORGOT_PASSWORD_QUESTION,
        method: 'post',
        data
    }
}

export const verifySecurityAnswer = (data) => {
    return {
        url: API.AUTH.FORGOT_PASSWORD_VERIFY,
        method: 'post',
        data
    }
}

export const resetPassword = (data) => {
    return {
        url: API.AUTH.FORGOT_PASSWORD_RESET,
        method: 'post',
        data
    }
}