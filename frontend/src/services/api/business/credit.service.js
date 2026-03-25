// services/business/credit.service.js
import businessDataService from '@/services/cache/business-cache.service.js'
import baseService from './base.service.js'

/**
 * 赊账管理业务服务
 */
class CreditService {
    /**
     * 获取所有赊账记录（应付和应收）
     */
    async getAllCreditRecords() {
        const expenseRecords = await businessDataService.getAllExpenseRecords()
        const incomeRecords = await businessDataService.getAllIncomeRecords()

        const payableCredits = expenseRecords
            .filter(record => record.paymentMethod === '赊账' && !record.isPaid)
            .map(record => ({ ...record, type: 'expense', creditType: 'payable', sourceTable: 'expense_records' }))

        const receivableCredits = incomeRecords
            .filter(record => record.paymentMethod === '赊账' && !record.isPaid)
            .map(record => ({ ...record, type: 'income', creditType: 'receivable', sourceTable: 'income_records' }))

        return {
            payableCredits, receivableCredits,
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

        const payableOverdue = payableCredits.filter(c => this.isCreditOverdue(c.expectedRepayDate)).length
        const receivableOverdue = receivableCredits.filter(c => this.isCreditOverdue(c.expectedRepayDate)).length

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
        const { amount, date, paymentMethod, note } = repaymentData

        const record = await businessDataService.getExpenseRecordById(recordId)
        if (!record) throw new Error('赊账记录不存在')
        if (record.paymentMethod !== '赊账') throw new Error('该记录不是赊账记录')

        const repaymentAmount = parseFloat(amount)
        const remainingAmount = record.amount - repaymentAmount

        const updatedRecord = {
            ...record,
            amount: remainingAmount,
            isPaid: remainingAmount <= 0,
            repayDate: date,
            repayMethod: paymentMethod,
            repayNote: note
        }

        return businessDataService.updateExpenseRecord(recordId, updatedRecord)
    }

    /**
     * 记录应收账款收款
     */
    async recordReceivableCollection(recordId, collectionData) {
        const { amount, date, paymentMethod, note } = collectionData

        const record = await businessDataService.getIncomeRecordById(recordId)
        if (!record) throw new Error('赊账记录不存在')
        if (record.paymentMethod !== '赊账') throw new Error('该记录不是赊账记录')

        const collectionAmount = parseFloat(amount)
        const remainingAmount = record.amount - collectionAmount

        const updatedRecord = {
            ...record,
            amount: remainingAmount,
            isPaid: remainingAmount <= 0,
            repayDate: date,
            repayMethod: paymentMethod,
            repayNote: note
        }

        const result = await businessDataService.updateIncomeRecord(recordId, updatedRecord)

        // 更新客户赊账余额
        if (result && record.customerId) {
            const repaymentData = {
                amount: collectionAmount,
                date: date,
                paymentMethod: paymentMethod,
                note: note
            }
            await businessDataService.recordCustomerRepayment(record.customerId, repaymentData)
        }

        return result
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