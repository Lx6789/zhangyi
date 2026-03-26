// services/business/credit.service.js
import businessDataService from '@/services/cache/business-cache.service.js'
import baseService from './base.service.js'

/**
 * 赊账管理业务服务
 * 只包含业务逻辑，数据库操作全部委托给 businessDataService
 */
class CreditService {
    /**
     * 获取所有赊账记录（应付和应收）
     */
    async getAllCreditRecords() {
        const expenseRecords = await businessDataService.getAllExpenseRecords()
        const incomeRecords = await businessDataService.getAllIncomeRecords()

        // 应付账款（支出赊账）- 计算剩余金额
        const payableCredits = expenseRecords
            .filter(record => record.paymentMethod === '赊账')
            .map(record => {
                const repaidAmount = record.repaidAmount || 0
                const remainingAmount = record.amount - repaidAmount
                return {
                    ...record,
                    type: 'expense',
                    creditType: 'payable',
                    amount: remainingAmount,  // 显示剩余欠款
                    originalAmount: record.amount,  // 原始赊账金额
                    repaidAmount: repaidAmount,
                    isPaid: remainingAmount <= 0
                }
            })

        // 应收账款（收入赊账）- 计算剩余金额
        const receivableCredits = incomeRecords
            .filter(record => record.paymentMethod === '赊账')
            .map(record => {
                const repaidAmount = record.repaidAmount || 0
                const remainingAmount = record.amount - repaidAmount
                return {
                    ...record,
                    type: 'income',
                    creditType: 'receivable',
                    amount: remainingAmount,  // 显示剩余欠款
                    originalAmount: record.amount,  // 原始赊账金额
                    repaidAmount: repaidAmount,
                    isPaid: remainingAmount <= 0
                }
            })

        return {
            payableCredits,
            receivableCredits,
            totalPayable: payableCredits.reduce((sum, c) => sum + (c.amount || 0), 0),
            totalReceivable: receivableCredits.reduce((sum, c) => sum + (c.amount || 0), 0),
            totalCredit: payableCredits.reduce((sum, c) => sum + (c.amount || 0), 0) +
                receivableCredits.reduce((sum, c) => sum + (c.amount || 0), 0)
        }
    }

    /**
     * 获取赊账统计数据
     */
    async getCreditStats() {
        const { payableCredits, receivableCredits } = await this.getAllCreditRecords()

        // 只统计未还清的逾期记录
        const payableOverdue = payableCredits
            .filter(c => !c.isPaid && this.isCreditOverdue(c.expectedRepayDate))
            .length
        const receivableOverdue = receivableCredits
            .filter(c => !c.isPaid && this.isCreditOverdue(c.expectedRepayDate))
            .length

        return {
            totalPayable: payableCredits.reduce((sum, c) => sum + (c.amount || 0), 0),
            totalReceivable: receivableCredits.reduce((sum, c) => sum + (c.amount || 0), 0),
            totalCredit: payableCredits.reduce((sum, c) => sum + (c.amount || 0), 0) +
                receivableCredits.reduce((sum, c) => sum + (c.amount || 0), 0),
            payableCount: payableCredits.length,
            receivableCount: receivableCredits.length,
            overdueCount: payableOverdue + receivableOverdue
        }
    }

    /**
     * 判断赊账是否逾期
     */
    isCreditOverdue(expectedDate) {
        if (!expectedDate) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dueDate = new Date(expectedDate)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate < today
    }

    /**
     * 过滤赊账记录
     */
    filterCreditRecords(credits, filters = {}) {
        let filtered = [...credits]

        if (filters.overdueOnly) {
            filtered = filtered.filter(c => this.isCreditOverdue(c.expectedRepayDate))
        }

        if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase().trim()
            filtered = filtered.filter(c => {
                if (c.creditType === 'payable') {
                    return (c.category && c.category.toLowerCase().includes(keyword)) ||
                        (c.subtype && c.subtype.toLowerCase().includes(keyword)) ||
                        (c.supplier && c.supplier.toLowerCase().includes(keyword)) ||
                        (c.note && c.note.toLowerCase().includes(keyword))
                } else {
                    return (c.productName && c.productName.toLowerCase().includes(keyword)) ||
                        (c.category && c.category.toLowerCase().includes(keyword)) ||
                        (c.customer && c.customer.toLowerCase().includes(keyword)) ||
                        (c.note && c.note.toLowerCase().includes(keyword))
                }
            })
        }

        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 获取应付账款列表
     */
    async getPayableCredits(filters = {}) {
        const { payableCredits } = await this.getAllCreditRecords()
        return this.filterCreditRecords(payableCredits, filters)
    }

    /**
     * 获取应收账款列表
     */
    async getReceivableCredits(filters = {}) {
        const { receivableCredits } = await this.getAllCreditRecords()
        return this.filterCreditRecords(receivableCredits, filters)
    }

    /**
     * 记录应付账款还款
     */
    async recordPayableRepayment(recordId, repaymentData) {
        return await businessDataService.recordPayableRepayment(recordId, repaymentData)
    }

    /**
     * 记录应收账款收款
     */
    async recordReceivableCollection(recordId, collectionData) {
        return await businessDataService.recordReceivableCollection(recordId, collectionData)
    }

    /**
     * 获取应付账款统计
     */
    async getPayableStats() {
        const { payableCredits } = await this.getAllCreditRecords()
        const total = payableCredits.reduce((sum, c) => sum + (c.amount || 0), 0)
        const overdue = payableCredits.filter(c => this.isCreditOverdue(c.expectedRepayDate))
        return {
            total,
            overdueTotal: overdue.reduce((sum, c) => sum + (c.amount || 0), 0),
            count: payableCredits.length,
            overdueCount: overdue.length
        }
    }

    /**
     * 获取应收账款统计
     */
    async getReceivableStats() {
        const { receivableCredits } = await this.getAllCreditRecords()
        const total = receivableCredits.reduce((sum, c) => sum + (c.amount || 0), 0)
        const overdue = receivableCredits.filter(c => this.isCreditOverdue(c.expectedRepayDate))
        return {
            total,
            overdueTotal: overdue.reduce((sum, c) => sum + (c.amount || 0), 0),
            count: receivableCredits.length,
            overdueCount: overdue.length
        }
    }

    /**
     * 获取赊账记录详情
     */
    async getCreditDetail(recordId, type) {
        if (type === 'expense') {
            const record = await businessDataService.getExpenseRecordById(recordId)
            if (record) return { ...record, creditType: 'payable', detailType: 'expense' }
        } else {
            const record = await businessDataService.getIncomeRecordById(recordId)
            if (record) return { ...record, creditType: 'receivable', detailType: 'income' }
        }
        return null
    }

    /**
     * 获取应付账款标签样式类名
     */
    getPayableBadgeClass(credit) {
        if (credit.isPaid) return 'badge-paid'
        if (this.isCreditOverdue(credit.expectedRepayDate)) return 'badge-overdue'
        return 'badge-pending'
    }

    /**
     * 获取应付账款标签文本
     */
    getPayableBadgeText(credit) {
        if (credit.isPaid) return '已还清'
        if (this.isCreditOverdue(credit.expectedRepayDate)) return '逾期未还'
        return '待还款'
    }

    /**
     * 获取应收账款标签样式类名
     */
    getReceivableBadgeClass(credit) {
        if (credit.isPaid) return 'badge-paid'
        if (this.isCreditOverdue(credit.expectedRepayDate)) return 'badge-overdue'
        return 'badge-pending'
    }

    /**
     * 获取应收账款标签文本
     */
    getReceivableBadgeText(credit) {
        if (credit.isPaid) return '已收清'
        if (this.isCreditOverdue(credit.expectedRepayDate)) return '逾期未收'
        return '待收款'
    }

    /**
     * 格式化赊账金额
     */
    formatCreditAmount(amount, type) {
        const formatted = baseService.formatNumber(amount)
        return type === 'payable' ? `-¥${formatted}` : `+¥${formatted}`
    }

    /**
     * 获取搜索框占位符文本
     */
    getCreditSearchPlaceholder(activeTab) {
        if (activeTab === 'payable') return '搜索支出类型、供应商、备注...'
        if (activeTab === 'receivable') return '搜索商品、客户、备注...'
        return '搜索商品、客户、供应商、备注...'
    }
}

export default new CreditService()