/**
 * API接口地址常量 - 统一管理所有API路径
 */
export const API = {
    // 认证相关
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        GENERATE_CAPTCHA: '/auth/captcha/generate',
        VERIFY_CAPTCHA: '/auth/captcha/verify',
        LOGOUT: '/auth/logout',
        USER_INFO: '/auth/userInfo',
        FORGOT_PASSWORD_QUESTION: '/auth/forgot-password/question',
        FORGOT_PASSWORD_VERIFY: '/auth/forgot-password/verify',
        FORGOT_PASSWORD_RESET: '/auth/forgot-password/reset'
    },

    // 业务相关
    BUSINESS: {
        LIST: '/business/list',
        DETAIL: '/business/detail',
        CREATE: '/business/create',
        UPDATE: '/business/update',
        DELETE: '/business/delete'
    },

    // 图表相关
    CHART: {
        DATA: '/chart/data',
        TREND: '/chart/trend',
        STATISTICS: '/chart/statistics'
    },

    // 储蓄相关
    SAVING: {
        LIST: '/savings/list',
        DETAIL: '/savings/detail',
        CREATE: '/savings/create',

        // 多人存钱接口
        GROUP: {
            LIST: '/savings/group/list',
            DETAIL: '/savings/group/{id}',
            CREATE: '/savings/group/create',
            UPDATE: '/savings/group/{id}',
            DELETE: '/savings/group/{id}',
            JOIN: '/savings/group/{id}/join',
            LEAVE: '/savings/group/{id}/leave',
            UPDATE_MEMBER: '/savings/group/{planId}/member/{memberId}',
            DEPOSIT: '/savings/group/{id}/deposit',
            RECORDS: '/savings/group/records',
            MEMBER_RECORDS: '/savings/group/{planId}/member/{memberId}/records',
            DEPOSIT_RECORDS: '/savings/group/{planId}/deposit-records'  // 计划的所有存款记录
        }
    },
};

// 扁平化导出也需要添加
export const API_FLAT = {
    // 认证相关
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    GENERATE_CAPTCHA: '/auth/captcha/generate',
    VERIFY_CAPTCHA: '/auth/captcha/verify',
    LOGOUT: '/auth/logout',
    USER_INFO: '/auth/userInfo',

    // 忘记密码相关
    FORGOT_PASSWORD_QUESTION: '/auth/forgot-password/question',
    FORGOT_PASSWORD_VERIFY: '/auth/forgot-password/verify',
    FORGOT_PASSWORD_RESET: '/auth/forgot-password/reset',

    // 业务相关
    BUSINESS_LIST: '/business/list',
    CHART_DATA: '/chart/data',
    SAVING_LIST: '/saving/list',

    // 好友相关
    FRIEND_LIST: '/friends/list',
    FRIEND_REQUEST_SEND: '/friends/request/send',
    FRIEND_REQUEST_RECEIVED: '/friends/request/received',
    FRIEND_REQUEST_SENT: '/friends/request/sent',
    FRIEND_REQUEST_ACCEPT: '/friends/request/accept/{requestId}',
    FRIEND_REQUEST_REJECT: '/friends/request/reject/{requestId}',
    FRIEND_DELETE: '/friends/{friendId}'
};

export default API;