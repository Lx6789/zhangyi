import businessDataService from '@/services/cache/business-cache.service.js'
import userDataService from '@/services/user-data.service.js'

/**
 * 基础业务服务
 * 包含初始化、用户相关、基础工具方法
 */
class BaseService {
    constructor() {
        this.initialized = false
        this.currentUserId = null
    }

    /**
     * 初始化
     */
    async init(userId) {
        if (!this.initialized) {
            await businessDataService.init(userId)
            this.currentUserId = businessDataService.getCurrentUserId()
            this.initialized = true
            console.log('基础业务服务初始化成功，用户ID:', this.currentUserId)
        }
    }

    /**
     * 获取当前用户ID
     */
    getCurrentUserId() {
        return this.currentUserId || businessDataService.getCurrentUserId()
    }

    /**
     * 格式化数字
     */
    formatNumber(num) {
        if (num === undefined || num === null) return '0.00'
        const value = typeof num === 'number' ? num : parseFloat(num) || 0
        return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    /**
     * 格式化百分比
     */
    formatPercent(num) {
        if (num === undefined || num === null) return '0%'
        const value = typeof num === 'number' ? num : parseFloat(num) || 0
        return (value * 100).toFixed(1) + '%'
    }

    /**
     * 格式化日期（YYYY-MM-DD）
     */
    formatDateYMD(date) {
        if (!date) return ''
        const d = typeof date === 'string' ? new Date(date) : date
        const year = d.getFullYear()
        const month = (d.getMonth() + 1).toString().padStart(2, '0')
        const day = d.getDate().toString().padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    /**
     * 格式化显示日期（YYYY.MM.DD）
     */
    formatDisplayDate(dateStr) {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        return `${year}.${month}.${day}`
    }

    /**
     * 格式化日期时间
     */
    formatDateTime(dateStr) {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        return `${year}-${month}-${day} ${hours}:${minutes}`
    }

    /**
     * 添加天数
     */
    addDays(dateStr, days) {
        const date = new Date(dateStr)
        date.setDate(date.getDate() + days)
        return this.formatDateYMD(date)
    }
}

export default new BaseService()