// services/business/customer.service.js
import businessDataService from '@/services/cache/business-cache.service.js'
import baseService from './base.service.js'

/**
 * 客户管理业务服务
 * 只包含业务逻辑，数据库操作全部委托给 businessDataService
 */
class CustomerService {
    /**
     * 获取所有客户列表（带交易统计）
     */
    async getAllCustomers() {
        return businessDataService.getAllCustomersWithStats()
    }

    /**
     * 筛选客户
     */
    filterCustomers(customers, filters = {}) {
        let filtered = [...customers]
        const { type, keyword } = filters

        if (type && type !== '全部') {
            if (type === '有赊账') {
                filtered = filtered.filter(c => c.creditInfo?.hasCredit && (c.creditInfo?.balance || 0) > 0)
            } else {
                filtered = filtered.filter(c => c.type === type)
            }
        }

        if (keyword && keyword.trim()) {
            const searchTerm = keyword.toLowerCase().trim()
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(searchTerm) ||
                (c.phone && c.phone.includes(searchTerm)) ||
                (c.type && c.type.toLowerCase().includes(searchTerm))
            )
        }

        return filtered
    }

    /**
     * 添加客户
     */
    async addCustomer(customerData) {
        if (!customerData.name) throw new Error('客户名称不能为空')

        const newCustomer = {
            ...customerData,
            creditInfo: customerData.hasCredit ? {
                hasCredit: true,
                creditLimit: customerData.creditLimit ? parseFloat(customerData.creditLimit) : null,
                settlementDays: customerData.settlementDays ? parseInt(customerData.settlementDays) : null,
                note: customerData.creditNote || '',
                balance: 0,
                lastRepayDate: null
            } : { hasCredit: false },
            stats: { transactionCount: 0, totalAmount: 0, lastTransactionDate: null }
        }

        return businessDataService.addCustomer(newCustomer)
    }

    /**
     * 更新客户
     */
    async updateCustomer(customerId, customerData) {
        const existingCustomer = businessDataService.getCustomerById(customerId)
        if (!existingCustomer) throw new Error('客户不存在')

        const updatedCustomer = {
            ...existingCustomer,
            ...customerData,
            creditInfo: customerData.hasCredit ? {
                hasCredit: true,
                creditLimit: customerData.creditLimit ? parseFloat(customerData.creditLimit) : null,
                settlementDays: customerData.settlementDays ? parseInt(customerData.settlementDays) : null,
                note: customerData.creditNote || '',
                balance: existingCustomer.creditInfo?.balance || 0,
                lastRepayDate: existingCustomer.creditInfo?.lastRepayDate || null
            } : { hasCredit: false },
            updateTime: new Date().toISOString()
        }

        const result = businessDataService.updateCustomer(customerId, updatedCustomer)
        if (!result) throw new Error('更新客户失败')
        return result
    }

    /**
     * 删除客户
     */
    async deleteCustomer(customerId) {
        const existing = businessDataService.getCustomerById(customerId)
        if (!existing) throw new Error('客户不存在')

        const deleted = businessDataService.deleteCustomer(customerId)
        if (!deleted) throw new Error('删除客户失败')
        return true
    }

    /**
     * 获取客户详情（含交易记录）
     */
    async getCustomerDetail(customerId) {
        return businessDataService.getCustomerDetail(customerId)
    }

    /**
     * 获取客户交易记录
     */
    async getCustomerTransactions(customerId, range = 'all') {
        return businessDataService.getCustomerTransactions(customerId, range)
    }

    /**
     * 记录客户还款
     */
    async recordCustomerRepayment(customerId, repaymentData) {
        const { amount, date, paymentMethod, note } = repaymentData
        const repaymentAmount = parseFloat(amount)

        if (repaymentAmount <= 0) throw new Error('还款金额必须大于0')

        const customer = businessDataService.getCustomerById(customerId)
        if (!customer) throw new Error('客户不存在')

        const currentBalance = customer.creditInfo?.balance || 0
        if (repaymentAmount > currentBalance) throw new Error('还款金额不能大于当前欠款')

        return businessDataService.recordCustomerRepayment(customerId, repaymentData)
    }

    /**
     * 获取客户还款历史
     */
    async getCustomerRepaymentHistory(customerId) {
        return businessDataService.getCustomerRepaymentHistory(customerId)
    }

    /**
     * 获取客户赊账统计
     */
    async getCustomerCreditStats() {
        return businessDataService.getCustomerCreditStats()
    }

    /**
     * 获取客户类型统计
     */
    async getCustomerTypeStats() {
        const customers = await this.getAllCustomers()
        const typeStats = {}

        customers.forEach(customer => {
            const type = customer.type || '零售客户'
            if (!typeStats[type]) typeStats[type] = { count: 0, totalAmount: 0 }
            typeStats[type].count++
            typeStats[type].totalAmount += customer.stats?.totalAmount || 0
        })

        return typeStats
    }

    /**
     * 获取高频客户
     */
    async getTopCustomersByTransaction(limit = 10) {
        const customers = await this.getAllCustomers()
        return customers
            .filter(c => c.stats?.transactionCount > 0)
            .sort((a, b) => (b.stats?.transactionCount || 0) - (a.stats?.transactionCount || 0))
            .slice(0, limit)
            .map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                transactionCount: c.stats?.transactionCount || 0,
                totalAmount: c.stats?.totalAmount || 0
            }))
    }

    /**
     * 获取大额客户
     */
    async getTopCustomersByAmount(limit = 10) {
        const customers = await this.getAllCustomers()
        return customers
            .filter(c => c.stats?.totalAmount > 0)
            .sort((a, b) => (b.stats?.totalAmount || 0) - (a.stats?.totalAmount || 0))
            .slice(0, limit)
            .map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                totalAmount: c.stats?.totalAmount || 0,
                transactionCount: c.stats?.transactionCount || 0
            }))
    }

    /**
     * 获取客户类型列表
     */
    getCustomerTypes() {
        return ['全部', '零售客户', '批发客户', '长期客户', '单位客户', '有赊账']
    }

    /**
     * 获取客户快速操作选项
     */
    getCustomerQuickActions() {
        return [
            { key: 'record_income', label: '记收入', icon: 'fas fa-money-bill-wave', color: '#2ecc71' },
            { key: 'view_transactions', label: '记录', icon: 'fas fa-history', color: '#80A492' },
            { key: 'repayment', label: '还款', icon: 'fas fa-hand-holding-usd', color: '#e74c3c' }
        ]
    }

    /**
     * 获取客户信用信息
     */
    getCustomerCreditInfo(customer) {
        if (!customer || !customer.creditInfo?.hasCredit) {
            return { hasCredit: false, balance: 0, creditLimit: null }
        }
        return {
            hasCredit: true,
            balance: customer.creditInfo.balance || 0,
            creditLimit: customer.creditInfo.creditLimit,
            isNearLimit: customer.creditInfo.creditLimit && (customer.creditInfo.balance || 0) >= customer.creditInfo.creditLimit * 0.8
        }
    }

    /**
     * 检查客户是否可以赊账
     */
    canCustomerUseCredit(customer) {
        if (!customer) return true
        return customer.creditInfo?.hasCredit === true
    }
}

export default new CustomerService()