/**
 * API接口地址常量 - 统一管理所有API路径
 */

// API 基础路径
const API_BASE = '/api'

export const API = {
    // // 认证相关
    // AUTH: {
    //     LOGIN: `${API_BASE}/auth/login`,
    //     REGISTER: `${API_BASE}/auth/register`,
    //     GENERATE_CAPTCHA: `${API_BASE}/auth/captcha/generate`,
    //     VERIFY_CAPTCHA: `${API_BASE}/auth/captcha/verify`,
    //     LOGOUT: `${API_BASE}/auth/logout`,
    //     USER_INFO: `${API_BASE}/auth/userInfo`,
    //     FORGOT_PASSWORD_QUESTION: `${API_BASE}/auth/forgot-password/question`,
    //     FORGOT_PASSWORD_VERIFY: `${API_BASE}/auth/forgot-password/verify`,
    //     FORGOT_PASSWORD_RESET: `${API_BASE}/auth/forgot-password/reset`
    // },
    //
    // // 业务相关
    // BUSINESS: {
    //     LIST: `${API_BASE}/business/list`,
    //     DETAIL: `${API_BASE}/business/detail`,
    //     CREATE: `${API_BASE}/business/create`,
    //     UPDATE: `${API_BASE}/business/update`,
    //     DELETE: `${API_BASE}/business/delete`
    // },
    //
    // // 图表相关
    // CHART: {
    //     DATA: `${API_BASE}/chart/data`,
    //     TREND: `${API_BASE}/chart/trend`,
    //     STATISTICS: `${API_BASE}/chart/statistics`
    // },
    //
    // // 储蓄相关
    // SAVING: {
    //     LIST: `${API_BASE}/savings/list`,
    //     DETAIL: `${API_BASE}/savings/detail`,
    //     CREATE: `${API_BASE}/savings/create`,
    //
    //     // 多人存钱接口
    //     GROUP: {
    //         LIST: `${API_BASE}/savings/group/list`,
    //         DETAIL: `${API_BASE}/savings/group/{id}`,
    //         CREATE: `${API_BASE}/savings/group/create`,
    //         UPDATE: `${API_BASE}/savings/group/{id}`,
    //         DELETE: `${API_BASE}/savings/group/{id}`,
    //         JOIN: `${API_BASE}/savings/group/{id}/join`,
    //         LEAVE: `${API_BASE}/savings/group/{id}/leave`,
    //         UPDATE_MEMBER: `${API_BASE}/savings/group/{planId}/member/{memberId}`,
    //         DEPOSIT: `${API_BASE}/savings/group/{id}/deposit`,
    //         RECORDS: `${API_BASE}/savings/group/records`,
    //         MEMBER_RECORDS: `${API_BASE}/savings/group/{planId}/member/{memberId}/records`,
    //         DEPOSIT_RECORDS: `${API_BASE}/savings/group/{planId}/deposit-records`  // 计划的所有存款记录
    //     }
    // },
    // 认证相关
    AUTH: {
        LOGIN: `/auth/login`,
        REGISTER: `/auth/register`,
        GENERATE_CAPTCHA: `/auth/captcha/generate`,
        VERIFY_CAPTCHA: `/auth/captcha/verify`,
        LOGOUT: `/auth/logout`,
        USER_INFO: `/auth/userInfo`,
        FORGOT_PASSWORD_QUESTION: `/auth/forgot-password/question`,
        FORGOT_PASSWORD_VERIFY: `/auth/forgot-password/verify`,
        FORGOT_PASSWORD_RESET: `/auth/forgot-password/reset`
    },

    // 业务相关
    BUSINESS: {
        LIST: `/business/list`,
        DETAIL: `/business/detail`,
        CREATE: `/business/create`,
        UPDATE: `/business/update`,
        DELETE: `/business/delete`
    },

    // 图表相关
    CHART: {
        DATA: `/chart/data`,
        TREND: `/chart/trend`,
        STATISTICS: `/chart/statistics`
    },

    // 储蓄相关
    SAVING: {
        LIST: `/savings/list`,
        DETAIL: `/savings/detail`,
        CREATE: `/savings/create`,

        // 多人存钱接口
        GROUP: {
            LIST: `/savings/group/list`,
            DETAIL: `/savings/group/{id}`,
            CREATE: `/savings/group/create`,
            UPDATE: `/savings/group/{id}`,
            DELETE: `/savings/group/{id}`,
            JOIN: `$/savings/group/{id}/join`,
            LEAVE: `/savings/group/{id}/leave`,
            UPDATE_MEMBER: `/savings/group/{planId}/member/{memberId}`,
            DEPOSIT: `/savings/group/{id}/deposit`,
            RECORDS: `/savings/group/records`,
            MEMBER_RECORDS: `/savings/group/{planId}/member/{memberId}/records`,
            DEPOSIT_RECORDS: `/savings/group/{planId}/deposit-records`  // 计划的所有存款记录
        },
    },

    // 云端备份相关
    BACKUP: {
        // 上传备份
        UPLOAD: `/backup/upload`,
        // 获取备份列表
        LIST: `/backup/list`,
        // 获取备份详情
        DETAIL: `/backup/detail/{backupId}`,
        // 恢复备份
        RESTORE: `/backup/restore/{backupId}`,
        // 删除备份
        DELETE: `/backup/delete/{backupId}`,
        // 获取备份统计信息
        STATS: `/backup/stats`
    }
};

// 扁平化导出也需要添加
export const API_FLAT = {
    // // 认证相关
    // LOGIN: `${API_BASE}/auth/login`,
    // REGISTER: `${API_BASE}/auth/register`,
    // GENERATE_CAPTCHA: `${API_BASE}/auth/captcha/generate`,
    // VERIFY_CAPTCHA: `${API_BASE}/auth/captcha/verify`,
    // LOGOUT: `${API_BASE}/auth/logout`,
    // USER_INFO: `${API_BASE}/auth/userInfo`,
    //
    // // 忘记密码相关
    // FORGOT_PASSWORD_QUESTION: `${API_BASE}/auth/forgot-password/question`,
    // FORGOT_PASSWORD_VERIFY: `${API_BASE}/auth/forgot-password/verify`,
    // FORGOT_PASSWORD_RESET: `${API_BASE}/auth/forgot-password/reset`,
    //
    // // 业务相关
    // BUSINESS_LIST: `${API_BASE}/business/list`,
    // CHART_DATA: `${API_BASE}/chart/data`,
    // SAVING_LIST: `${API_BASE}/saving/list`,
    //
    // // 好友相关
    // FRIEND_LIST: `${API_BASE}/friends/list`,
    // FRIEND_REQUEST_SEND: `${API_BASE}/friends/request/send`,
    // FRIEND_REQUEST_RECEIVED: `${API_BASE}/friends/request/received`,
    // FRIEND_REQUEST_SENT: `${API_BASE}/friends/request/sent`,
    // FRIEND_REQUEST_ACCEPT: `${API_BASE}/friends/request/accept/{requestId}`,
    // FRIEND_REQUEST_REJECT: `${API_BASE}/friends/request/reject/{requestId}`,
    // FRIEND_DELETE: `${API_BASE}/friends/{friendId}`

    // 认证相关
    LOGIN: `/auth/login`,
    REGISTER: `/auth/register`,
    GENERATE_CAPTCHA: `/auth/captcha/generate`,
    VERIFY_CAPTCHA: `/auth/captcha/verify`,
    LOGOUT: `/auth/logout`,
    USER_INFO: `/auth/userInfo`,

    // 忘记密码相关
    FORGOT_PASSWORD_QUESTION: `/auth/forgot-password/question`,
    FORGOT_PASSWORD_VERIFY: `/auth/forgot-password/verify`,
    FORGOT_PASSWORD_RESET: `/auth/forgot-password/reset`,

    // 业务相关
    BUSINESS_LIST: `/business/list`,
    CHART_DATA: `/chart/data`,
    SAVING_LIST: `/saving/list`,

    // 好友相关
    FRIEND_LIST: `/friends/list`,
    FRIEND_REQUEST_SEND: `/friends/request/send`,
    FRIEND_REQUEST_RECEIVED: `/friends/request/received`,
    FRIEND_REQUEST_SENT: `/friends/request/sent`,
    FRIEND_REQUEST_ACCEPT: `/friends/request/accept/{requestId}`,
    FRIEND_REQUEST_REJECT: `/friends/request/reject/{requestId}`,
    FRIEND_DELETE: `/friends/{friendId}`,

    // 备份相关
    BACKUP_UPLOAD: `/backup/upload`,
    BACKUP_LIST: `/backup/list`,
    BACKUP_DETAIL: `/backup/detail/{backupId}`,
    BACKUP_RESTORE: `/backup/restore/{backupId}`,
    BACKUP_DELETE: `/backup/delete/{backupId}`,
    BACKUP_STATS: `/backup/stats`
};

export default API;