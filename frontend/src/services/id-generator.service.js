// services/id-generator.service.js

/**
 * ID 生成服务
 * 为不同表生成统一格式的 ID
 * 格式: {prefix}_{userId}_{timestamp}_{random}
 */

class IdGeneratorService {
    constructor() {
        this.randomLength = 8 // 随机字符串长度
    }

    /**
     * 生成随机字符串
     * @param {number} length - 随机字符串长度
     * @returns {string} 随机字符串
     */
    generateRandomString(length = this.randomLength) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
        let result = ''
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }

    /**
     * 获取当前时间戳
     * @returns {number} 毫秒时间戳
     */
    getTimestamp() {
        return Date.now()
    }

    /**
     * 生成带时间戳和随机字符串的ID
     * @param {string} prefix - ID前缀
     * @param {string|number} userId - 用户ID
     * @param {string|number} [suffix] - 可选的额外后缀（如计划ID、好友ID等）
     * @returns {string} 生成的ID
     */
    generateId(prefix, userId, suffix = null) {
        const timestamp = this.getTimestamp()
        const random = this.generateRandomString()

        if (suffix) {
            return `${prefix}_${userId}_${suffix}_${timestamp}_${random}`
        }
        return `${prefix}_${userId}_${timestamp}_${random}`
    }

    // ==================== 各表专用的ID生成方法 ====================

    /**
     * 生成好友缓存ID
     * 格式: friend_{userId}_{friendId}
     * @param {string|number} userId - 当前用户ID
     * @param {string|number} friendId - 好友关系ID
     * @returns {string}
     */
    generateFriendId(userId, friendId) {
        return `friend_${userId}_${friendId}`
    }

    /**
     * 生成多人存钱计划缓存ID
     * 格式: group_{userId}_{planId}
     * @param {string|number} userId - 用户ID
     * @param {string|number} planId - 计划ID
     * @returns {string}
     */
    generateGroupSavingId(userId, planId) {
        return `group_${userId}_${planId}`
    }

    /**
     * 生成成员缓存ID
     * 格式: member_{userId}_{planId}_{memberId}
     * @param {string|number} userId - 用户ID
     * @param {string|number} planId - 计划ID
     * @param {string|number} memberId - 成员用户ID
     * @returns {string}
     */
    generateMemberId(userId, planId, memberId) {
        return `member_${userId}_${planId}_${memberId}`
    }

    /**
     * 生成存钱记录缓存ID
     * 格式: deposit_{userId}_{recordId}
     * @param {string|number} userId - 用户ID
     * @param {string|number} recordId - 记录ID
     * @returns {string}
     */
    generateDepositRecordId(userId, recordId) {
        return `deposit_${userId}_${recordId}`
    }

    /**
     * 生成商品分类ID
     * 格式: cat_{userId}_{timestamp}_{random}
     * @param {string|number} userId - 用户ID
     * @returns {string}
     */
    generateCategoryId(userId) {
        const timestamp = this.getTimestamp()
        const random = this.generateRandomString()
        return `cat_${userId}_${timestamp}_${random}`
    }

    /**
     * 生成商品ID
     * 格式: prod_{userId}_{timestamp}_{random}
     * @param {string|number} userId - 用户ID
     * @returns {string}
     */
    generateProductId(userId) {
        const timestamp = this.getTimestamp()
        const random = this.generateRandomString()
        return `prod_${userId}_${timestamp}_${random}`
    }

    /**
     * 生成个人存钱计划ID
     * 格式: personal_{userId}_{timestamp}_{random}
     * @param {string|number} userId - 用户ID
     * @returns {string}
     */
    generatePersonalSavingId(userId) {
        const timestamp = this.getTimestamp()
        const random = this.generateRandomString()
        return `personal_${userId}_${timestamp}_${random}`
    }

    /**
     * 生成日常记账记录ID
     * 格式: daily_{userId}_{timestamp}_{random}
     * @param {string|number} userId - 用户ID
     * @returns {string}
     */
    generateDailyRecordId(userId) {
        const timestamp = this.getTimestamp()
        const random = this.generateRandomString()
        return `daily_${userId}_${timestamp}_${random}`
    }

    /**
     * 生成支出记录ID
     * 格式: expense_{userId}_{timestamp}_{random}
     * @param {string|number} userId - 用户ID
     * @returns {string}
     */
    generateExpenseRecordId(userId) {
        const timestamp = this.getTimestamp()
        const random = this.generateRandomString()
        return `expense_${userId}_${timestamp}_${random}`
    }

    /**
     * 生成收入记录ID
     * 格式: income_{userId}_{timestamp}_{random}
     * @param {string|number} userId - 用户ID
     * @returns {string}
     */
    generateIncomeRecordId(userId) {
        const timestamp = this.getTimestamp()
        const random = this.generateRandomString()
        return `income_${userId}_${timestamp}_${random}`
    }

    /**
     * 生成库存项ID
     * 格式: inventory_{userId}_{timestamp}_{random}
     * @param {string|number} userId - 用户ID
     * @returns {string}
     */
    generateInventoryId(userId) {
        const timestamp = this.getTimestamp()
        const random = this.generateRandomString()
        return `inventory_${userId}_${timestamp}_${random}`
    }

    /**
     * 生成供应商ID
     * 格式: supplier_{userId}_{timestamp}_{random}
     * @param {string|number} userId - 用户ID
     * @returns {string}
     */
    generateSupplierId(userId) {
        const timestamp = this.getTimestamp()
        const random = this.generateRandomString()
        return `supplier_${userId}_${timestamp}_${random}`
    }

    /**
     * 生成采购订单ID
     * 格式: order_{userId}_{timestamp}_{random}
     * @param {string|number} userId - 用户ID
     * @returns {string}
     */
    generatePurchaseOrderId(userId) {
        const timestamp = this.getTimestamp()
        const random = this.generateRandomString()
        return `order_${userId}_${timestamp}_${random}`
    }

    /**
     * 生成采购历史ID
     * 格式: history_{userId}_{timestamp}_{random}
     * @param {string|number} userId - 用户ID
     * @returns {string}
     */
    generatePurchaseHistoryId(userId) {
        const timestamp = this.getTimestamp()
        const random = this.generateRandomString()
        return `history_${userId}_${timestamp}_${random}`
    }

    /**
     * 生成图表缓存ID
     * 格式: chart_{userId}_{type}_{timestamp}
     * @param {string|number} userId - 用户ID
     * @param {string} chartType - 图表类型
     * @returns {string}
     */
    generateChartCacheId(userId, chartType) {
        const timestamp = this.getTimestamp()
        return `chart_${userId}_${chartType}_${timestamp}`
    }

    /**
     * 生成同步状态ID
     * 格式: sync_{userId}_{storeName}
     * @param {string|number} userId - 用户ID
     * @param {string} storeName - 表名
     * @returns {string}
     */
    generateSyncStatusId(userId, storeName) {
        return `sync_${userId}_${storeName}`
    }

    /**
     * 生成离线队列表ID
     * 格式: offline_{userId}_{timestamp}_{random}
     * @param {string|number} userId - 用户ID
     * @returns {string}
     */
    generateOfflineQueueId(userId) {
        const timestamp = this.getTimestamp()
        const random = this.generateRandomString()
        return `offline_${userId}_${timestamp}_${random}`
    }

    /**
     * 生成存钱记录元数据ID
     * 格式: meta_{userId}_{planId}
     * @param {string|number} userId - 用户ID
     * @param {string|number} planId - 计划ID
     * @returns {string}
     */
    generateRecordsMetaId(userId, planId) {
        return `meta_${userId}_${planId}`
    }

    /**
     * 生成客户ID
     */
    generateCustomerId(userId) {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 8)
        return `CUST_${userId}_${timestamp}_${random}`
    }

    /**
     * 生成还款记录ID
     */
    generateRepaymentId(userId) {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 8)
        return `REPAY_${userId}_${timestamp}_${random}`
    }
}

export default new IdGeneratorService()