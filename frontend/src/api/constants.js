/**
 * API接口地址常量 - 统一管理所有API路径
 */

// API 基础路径
const API_BASE = '/api'

export const API = {
    // 认证相关
    AUTH: {
        LOGIN: `${API_BASE}/auth/login`,
        REGISTER: `${API_BASE}/auth/register`,
        GENERATE_CAPTCHA: `${API_BASE}/auth/captcha/generate`,
        VERIFY_CAPTCHA: `${API_BASE}/auth/captcha/verify`,
        LOGOUT: `${API_BASE}/auth/logout`,
        USER_INFO: `${API_BASE}/auth/userInfo`,
        FORGOT_PASSWORD_QUESTION: `${API_BASE}/auth/forgot-password/question`,
        FORGOT_PASSWORD_VERIFY: `${API_BASE}/auth/forgot-password/verify`,
        FORGOT_PASSWORD_RESET: `${API_BASE}/auth/forgot-password/reset`
    },

    // 版本管理相关
    VERSION: {
        LATEST: `${API_BASE}/version/latest`,
        CHECK: `${API_BASE}/version/check`,
        UPDATE: `${API_BASE}/version/update`,
        DOWNLOAD: `${API_BASE}/version/download/{versionId}`,
        LIST: `${API_BASE}/version/list`,
        DETAIL: `${API_BASE}/version/detail/{versionId}`,
        DELETE: `${API_BASE}/version/delete/{versionId}`
    },

    // 业务相关
    BUSINESS: {
        LIST: `${API_BASE}/business/list`,
        DETAIL: `${API_BASE}/business/detail`,
        CREATE: `${API_BASE}/business/create`,
        UPDATE: `${API_BASE}/business/update`,
        DELETE: `${API_BASE}/business/delete`
    },

    // 图表相关
    CHART: {
        DATA: `${API_BASE}/chart/data`,
        TREND: `${API_BASE}/chart/trend`,
        STATISTICS: `${API_BASE}/chart/statistics`
    },

    // 储蓄相关
    SAVING: {
        LIST: `${API_BASE}/savings/list`,
        DETAIL: `${API_BASE}/savings/detail`,
        CREATE: `${API_BASE}/savings/create`,

        // 多人存钱接口
        GROUP: {
            LIST: `${API_BASE}/savings/group/list`,
            DETAIL: `${API_BASE}/savings/group/{id}`,
            CREATE: `${API_BASE}/savings/group/create`,
            UPDATE: `${API_BASE}/savings/group/{id}`,
            DELETE: `${API_BASE}/savings/group/{id}`,
            JOIN: `${API_BASE}/savings/group/{id}/join`,
            LEAVE: `${API_BASE}/savings/group/{id}/leave`,
            UPDATE_MEMBER: `${API_BASE}/savings/group/{planId}/member/{memberId}`,
            DEPOSIT: `${API_BASE}/savings/group/{id}/deposit`,
            RECORDS: `${API_BASE}/savings/group/records`,
            MEMBER_RECORDS: `${API_BASE}/savings/group/{planId}/member/{memberId}/records`,
            DEPOSIT_RECORDS: `${API_BASE}/savings/group/{planId}/deposit-records`
        },
    },

    // 云端备份相关
    BACKUP: {
        UPLOAD: `${API_BASE}/backup/upload`,
        LIST: `${API_BASE}/backup/list`,
        DETAIL: `${API_BASE}/backup/detail/{backupId}`,
        RESTORE: `${API_BASE}/backup/restore/{backupId}`,
        DELETE: `${API_BASE}/backup/delete/{backupId}`,
        STATS: `${API_BASE}/backup/stats`,
        COUNT: `${API_BASE}/backup/count`
    }
};

// 扁平化导出
export const API_FLAT = {
    // 认证相关
    LOGIN: `${API_BASE}/auth/login`,
    REGISTER: `${API_BASE}/auth/register`,
    GENERATE_CAPTCHA: `${API_BASE}/auth/captcha/generate`,
    VERIFY_CAPTCHA: `${API_BASE}/auth/captcha/verify`,
    LOGOUT: `${API_BASE}/auth/logout`,
    USER_INFO: `${API_BASE}/auth/userInfo`,

    // 忘记密码相关
    FORGOT_PASSWORD_QUESTION: `${API_BASE}/auth/forgot-password/question`,
    FORGOT_PASSWORD_VERIFY: `${API_BASE}/auth/forgot-password/verify`,
    FORGOT_PASSWORD_RESET: `${API_BASE}/auth/forgot-password/reset`,

    // 版本管理相关
    VERSION_LATEST: `${API_BASE}/version/latest`,
    VERSION_CHECK: `${API_BASE}/version/check`,
    VERSION_UPDATE: `${API_BASE}/version/update`,
    VERSION_DOWNLOAD: `${API_BASE}/version/download/{versionId}`,
    VERSION_LIST: `${API_BASE}/version/list`,
    VERSION_DETAIL: `${API_BASE}/version/detail/{versionId}`,
    VERSION_DELETE: `${API_BASE}/version/delete/{versionId}`,

    // 业务相关
    BUSINESS_LIST: `${API_BASE}/business/list`,
    CHART_DATA: `${API_BASE}/chart/data`,
    SAVING_LIST: `${API_BASE}/saving/list`,

    // 好友相关
    FRIEND_LIST: `${API_BASE}/friends/list`,
    FRIEND_REQUEST_SEND: `${API_BASE}/friends/request/send`,
    FRIEND_REQUEST_RECEIVED: `${API_BASE}/friends/request/received`,
    FRIEND_REQUEST_SENT: `${API_BASE}/friends/request/sent`,
    FRIEND_REQUEST_ACCEPT: `${API_BASE}/friends/request/accept/{requestId}`,
    FRIEND_REQUEST_REJECT: `${API_BASE}/friends/request/reject/{requestId}`,
    FRIEND_DELETE: `${API_BASE}/friends/{friendId}`,

    // 备份相关
    BACKUP_UPLOAD: `${API_BASE}/backup/upload`,
    BACKUP_LIST: `${API_BASE}/backup/list`,
    BACKUP_DETAIL: `${API_BASE}/backup/detail/{backupId}`,
    BACKUP_RESTORE: `${API_BASE}/backup/restore/{backupId}`,
    BACKUP_DELETE: `${API_BASE}/backup/delete/{backupId}`,
    BACKUP_STATS: `${API_BASE}/backup/stats`
};

export default API;