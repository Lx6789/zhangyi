// services/business/income.service.js
import businessDataService from '@/services/cache/business-cache.service.js'
import baseService from './base.service.js'
import productService from './product.service.js'
import inventoryService from './inventory.service.js'
import idGeneratorService from "@/services/id-generator.service.js";
import userDataService from "@/services/user-data.service.js";

/**
 * 收入记账业务服务
 * 只包含业务逻辑，数据库操作全部委托给 businessDataService
 */
class IncomeService {
    /**
     * 获取销售渠道列表
     */
    getSalesChannels() {
        return [
            { value: '门店零售', label: '门店零售', icon: 'fa-store' },
            { value: '批发', label: '批发', icon: 'fa-truck' },
            { value: '线上订单', label: '线上订单', icon: 'fa-shopping-cart' },
            { value: '外卖平台', label: '外卖平台', icon: 'fa-motorcycle' },
            { value: '集市摆摊', label: '集市摆摊', icon: 'fa-store-alt' },
            { value: '单位团购', label: '单位团购', icon: 'fa-users' },
            { value: '其他', label: '其他', icon: 'fa-tag' }
        ]
    }

    /**
     * 获取支付方式列表
     */
    getPaymentMethods() {
        return [
            { value: '现金', label: '现金', icon: 'fa-money-bill-wave' },
            { value: '微信', label: '微信', icon: 'fa-wechat' },
            { value: '支付宝', label: '支付宝', icon: 'fa-alipay' },
            { value: '银行卡', label: '银行卡', icon: 'fa-credit-card' },
            { value: '赊账', label: '赊账', icon: 'fa-hand-holding-usd' }
        ]
    }

    /**
     * 获取商品单位列表
     */
    getProductUnits() {
        return ['斤', '公斤', '个', '份', '箱', '袋', '瓶', '包', '盒', '件', '条', '只']
    }

    /**
     * 获取客户类型列表
     */
    getCustomerTypes() {
        return ['零售客户', '批发客户', '长期客户', '单位客户']
    }

    /**
     * 添加收入记录
     */
    async addIncomeRecord(record) {
        if (!record.date) {
            record.date = baseService.formatDateYMD(new Date())
        }
        return businessDataService.addIncomeRecord(record)
    }

    /**
     * 批量添加收入记录
     */
    async addIncomeRecords(records) {
        for (const record of records) {
            if (!record.date) {
                record.date = baseService.formatDateYMD(new Date())
            }
        }
        return businessDataService.addIncomeRecords(records)
    }

    /**
     * 获取收入记录（支持筛选）
     */
    async getIncomeRecords(filters = {}) {
        let records = await businessDataService.getAllIncomeRecords()

        // 日期范围筛选
        if (filters.startDate && filters.endDate) {
            records = records.filter(r =>
                r.date >= filters.startDate && r.date <= filters.endDate
            )
        }

        // 分类筛选
        if (filters.category) {
            records = records.filter(r => r.category === filters.category)
        }

        // 业务类型筛选
        if (filters.businessType) {
            records = records.filter(r => r.businessType === filters.businessType)
        }

        // 支付方式筛选
        if (filters.paymentMethod) {
            records = records.filter(r => r.paymentMethod === filters.paymentMethod)
        }

        // 客户筛选
        if (filters.customerId) {
            records = records.filter(r =>
                r.customerId === filters.customerId || r.customer === filters.customerId
            )
        }

        return records.sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 获取生意收入记录
     */
    async getBusinessIncomeRecords(dateRange = null) {
        const filters = { businessType: 'business' }
        if (dateRange) {
            filters.startDate = dateRange.start
            filters.endDate = dateRange.end
        }
        return this.getIncomeRecords(filters)
    }

    /**
     * 更新收入记录
     */
    async updateIncomeRecord(id, data) {
        return businessDataService.updateIncomeRecord(id, data)
    }

    /**
     * 删除收入记录
     */
    async deleteIncomeRecord(id) {
        return businessDataService.deleteIncomeRecord(id)
    }

    /**
     * 验证收入表单数据
     */
    validateIncomeForm(formData, selectedProduct, selectedCustomer) {
        const errors = []

        if (!formData.category) errors.push('请选择商品分类')
        if (!formData.productId || !selectedProduct) errors.push('请选择商品')
        if (!formData.channel) errors.push('请选择销售渠道')
        if (!formData.quantity || parseFloat(formData.quantity) <= 0) errors.push('请输入有效的数量')
        if (!formData.price || parseFloat(formData.price) <= 0) errors.push('请输入有效的单价')
        if (!formData.date) errors.push('请选择日期')

        if (formData.paymentMethod === '赊账' && selectedCustomer && !this.canCustomerUseCredit(selectedCustomer)) {
            errors.push('该客户不允许赊账，请选择其他收款方式')
        }

        return { valid: errors.length === 0, errors }
    }

    /**
     * 验证批发模式的库存
     */
    validateWholesaleStock(inventory, quantity) {
        if (!inventory) return { valid: true, warning: false, message: null }

        const saleQuantity = parseFloat(quantity)
        const currentStock = inventory.quantity || 0

        if (saleQuantity > currentStock) {
            return {
                valid: false,
                warning: true,
                message: `销售数量 (${saleQuantity}) 超过当前库存 (${currentStock} ${inventory.unit})`,
                stockGap: saleQuantity - currentStock
            }
        }

        const minStock = inventory.minStock || 10
        const newStock = currentStock - saleQuantity
        if (newStock <= minStock) {
            return {
                valid: true,
                warning: true,
                message: `出库后库存将低于最低库存预警 (${minStock} ${inventory.unit})`,
                stockGap: 0
            }
        }

        return { valid: true, warning: false, message: null, stockGap: 0 }
    }

    /**
     * 计算收入总额
     */
    calculateIncomeTotal(quantity, price) {
        return (parseFloat(quantity) || 0) * (parseFloat(price) || 0)
    }

    /**
     * 创建收入记录对象
     */
    createIncomeRecord(formData, selectedProduct, selectedCustomer, totalAmount) {
        const record = {
            id: idGeneratorService.generateIncomeRecordId(userDataService.getCurrentUserId()),
            type: '收入',
            category: selectedProduct?.category || formData.category,
            source: formData.channel,
            amount: totalAmount,  // 原始赊账金额，保持不变
            date: formData.date,
            paymentMethod: formData.paymentMethod,
            note: `${selectedProduct?.name || ''} ${formData.quantity}${formData.unit} ${formData.note || ''}`.trim(),
            businessType: 'business',
            productId: selectedProduct?.id || null,
            productName: selectedProduct?.name || formData.category || '商品',
            channel: formData.channel,
            customer: selectedCustomer?.name || '散客',
            customerId: selectedCustomer?.id || null,
            quantity: parseFloat(formData.quantity) || 0,
            price: parseFloat(formData.price) || 0,
            unit: formData.unit || '斤',
            isPaid: formData.paymentMethod !== '赊账',  // 赊账时为 false
            repaidAmount: 0,  // 已还金额
            repayments: [],   // 还款记录列表
            expectedRepayDate: formData.paymentMethod === '赊账' ? formData.expectedRepayDate : null,
            creditNote: formData.paymentMethod === '赊账' ? formData.creditNote : null,
            isWholesale: formData.channel === '批发',
            autoUpdateInventory: formData.autoUpdateInventory
        }
        return record
    }

    /**
     * 处理客户赊账余额更新
     */
    async updateCustomerCreditBalance(customer, totalAmount) {
        if (!customer) return null

        console.log('updateCustomerCreditBalance 被调用')
        console.log('客户ID:', customer.id)
        console.log('客户名称:', customer.name)
        console.log('赊账金额:', totalAmount)

        // 获取当前余额
        const currentBalance = customer.creditInfo?.balance || 0
        const newBalance = currentBalance + totalAmount

        // 创建完全干净的对象，只包含必要字段
        const updatedCustomer = {
            id: customer.id,
            name: customer.name,
            type: customer.type || '零售客户',
            phone: customer.phone || '',
            address: customer.address || '',
            note: customer.note || '',
            creditInfo: {
                hasCredit: customer.creditInfo?.hasCredit || false,
                balance: newBalance,
                creditLimit: customer.creditInfo?.creditLimit || null,
                settlementDays: customer.creditInfo?.settlementDays || null,
                note: customer.creditInfo?.note || '',
                lastCreditDate: new Date().toISOString(),
                lastCreditAmount: totalAmount,
                lastRepayDate: customer.creditInfo?.lastRepayDate || null,
                lastRepayAmount: customer.creditInfo?.lastRepayAmount || 0
            },
            stats: {
                transactionCount: customer.stats?.transactionCount || 0,
                totalAmount: customer.stats?.totalAmount || 0,
                lastTransactionDate: customer.stats?.lastTransactionDate || null
            },
            userId: customer.userId,
            createTime: customer.createTime,
            updateTime: new Date().toISOString()
        }

        console.log('准备更新的客户数据:', updatedCustomer)

        // 更新到 IndexedDB
        try {
            const result = await businessDataService.updateCustomer(customer.id, updatedCustomer)
            console.log('更新结果:', result)
            return updatedCustomer
        } catch (error) {
            console.error('更新客户失败:', error)
            throw error
        }
    }

    /**
     * 创建新的客户对象
     */
    async createNewCustomer(customerData) {
        const newCustomer = {
            name: customerData.name,
            type: customerData.type || '零售客户',
            phone: customerData.phone || null,
            creditInfo: { hasCredit: false },
            stats: { transactionCount: 0, totalAmount: 0, lastTransactionDate: null },
            createTime: new Date().toISOString()
        }
        return businessDataService.addCustomer(newCustomer)
    }

    /**
     * 处理批发销售后的库存更新
     */
    processWholesaleStockUpdate(inventoryItem, quantity) {
        if (!inventoryItem) return { error: '商品不存在库存记录' }

        const currentQuantity = inventoryItem.quantity || 0
        const saleQuantity = parseFloat(quantity)
        const newQuantity = Math.max(0, currentQuantity - saleQuantity)

        return {
            exists: true,
            id: inventoryItem.id,
            quantity: newQuantity,
            updateTime: new Date().toISOString()
        }
    }

    /**
     * 获取建议售价
     */
    getSuggestedPrice(product, inventory) {
        if (inventory?.sellingPrice) return inventory.sellingPrice
        if (product?.defaultPrice) return product.defaultPrice
        return null
    }

    /**
     * 检查客户是否可以赊账
     */
    canCustomerUseCredit(customer) {
        if (!customer) return true
        return customer.creditInfo?.hasCredit === true
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
     * 格式化收入成功消息
     */
    formatIncomeSuccessMessage(productName, totalAmount, customerName, isCredit = false) {
        let message = `收入记录成功：${productName} ¥${totalAmount.toFixed(2)}`
        if (customerName && customerName !== '散客') message += `，客户：${customerName}`
        if (isCredit) message += `（赊账）`
        return message
    }

    /**
     * 获取批发模式的库存提示
     */
    getWholesaleStockHint(inventory) {
        if (!inventory) return null
        return `最大可售: ${inventory.quantity || 0} ${inventory.unit}`
    }

    /**
     * 检查销售数量是否有效
     */
    isValidSaleQuantity(quantity, inventory = null) {
        const qty = parseFloat(quantity)
        if (isNaN(qty) || qty <= 0) return false
        if (inventory && qty > inventory.quantity) return false
        return true
    }

    /**
     * 获取采购建议
     */
    getPurchaseSuggestion(inventory, quantity) {
        if (!inventory) return null

        const saleQuantity = parseFloat(quantity)
        const currentStock = inventory.quantity || 0

        if (saleQuantity <= currentStock) return null

        const stockGap = saleQuantity - currentStock
        return {
            productName: inventory.productName,
            currentStock,
            unit: inventory.unit,
            saleQuantity,
            stockGap,
            supplier: inventory.supplier,
            minStock: inventory.minStock || 10,
            suggestedQuantity: Math.ceil(stockGap * 1.2)
        }
    }

    /**
     * 获取收入统计
     */
    async getIncomeStats(dateRange = null) {
        let records = await businessDataService.getAllIncomeRecords()

        if (dateRange && dateRange.start && dateRange.end) {
            records = records.filter(r =>
                r.date >= dateRange.start && r.date <= dateRange.end
            )
        }

        const totalIncome = records.reduce((sum, r) => sum + (r.amount || 0), 0)
        const totalTransactions = records.length

        const byChannel = {}
        records.forEach(r => {
            const channel = r.channel || '其他'
            if (!byChannel[channel]) byChannel[channel] = { amount: 0, count: 0 }
            byChannel[channel].amount += r.amount || 0
            byChannel[channel].count++
        })

        const byPaymentMethod = {}
        records.forEach(r => {
            const method = r.paymentMethod || '其他'
            if (!byPaymentMethod[method]) byPaymentMethod[method] = { amount: 0, count: 0 }
            byPaymentMethod[method].amount += r.amount || 0
            byPaymentMethod[method].count++
        })

        return {
            totalIncome,
            totalTransactions,
            averageTransaction: totalTransactions > 0 ? totalIncome / totalTransactions : 0,
            byChannel,
            byPaymentMethod,
            creditAmount: records.filter(r => r.paymentMethod === '赊账' && !r.isPaid)
                .reduce((sum, r) => sum + (r.amount || 0), 0)
        }
    }

    /**
     * 获取收入趋势数据
     */
    async getIncomeTrend(rangeType = 'month') {
        const records = await businessDataService.getAllIncomeRecords()
        const businessRecords = records.filter(r => r.businessType === 'business')

        const trends = []
        const now = new Date()

        if (rangeType === 'week') {
            // 最近7天趋势
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now)
                date.setDate(date.getDate() - i)
                const dateStr = baseService.formatDateYMD(date)

                const dayIncome = businessRecords
                    .filter(r => r.date === dateStr)
                    .reduce((sum, r) => sum + (r.amount || 0), 0)

                trends.push({
                    period: `${date.getMonth() + 1}/${date.getDate()}`,
                    income: dayIncome
                })
            }
        } else if (rangeType === 'month') {
            // 最近4周趋势
            const weekData = new Array(4).fill(0)
            businessRecords.forEach(r => {
                const daysAgo = Math.floor((now - new Date(r.date)) / (1000 * 60 * 60 * 24))
                const weekIndex = Math.floor(daysAgo / 7)
                if (weekIndex >= 0 && weekIndex < 4) {
                    weekData[weekIndex] += r.amount || 0
                }
            })

            for (let i = 3; i >= 0; i--) {
                trends.push({
                    period: `第${4 - i}周`,
                    income: weekData[i]
                })
            }
        } else if (rangeType === 'year') {
            // 最近12个月趋势
            const monthData = new Array(12).fill(0)
            const currentYear = now.getFullYear()

            businessRecords.forEach(r => {
                const recordDate = new Date(r.date)
                if (recordDate.getFullYear() === currentYear) {
                    const month = recordDate.getMonth()
                    monthData[month] += r.amount || 0
                }
            })

            for (let i = 0; i < 12; i++) {
                if (monthData[i] > 0 || i === now.getMonth()) {
                    trends.push({
                        period: `${i + 1}月`,
                        income: monthData[i]
                    })
                }
            }
        }

        return trends
    }

    /**
     * 获取收入排行榜
     */
    async getIncomeRanking(limit = 10) {
        const records = await businessDataService.getAllIncomeRecords()
        const businessRecords = records.filter(r => r.businessType === 'business')

        const ranking = {}

        businessRecords.forEach(r => {
            const productName = r.productName || r.category || '其他'
            if (!ranking[productName]) {
                ranking[productName] = {
                    name: productName,
                    amount: 0,
                    quantity: 0,
                    count: 0
                }
            }
            ranking[productName].amount += r.amount || 0
            ranking[productName].quantity += r.quantity || 0
            ranking[productName].count++
        })

        return Object.values(ranking)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit)
    }

    /**
     * 导出收入记录为CSV
     */
    exportIncomeRecordsToCSV(records) {
        const data = records.map(r => ({
            日期: r.date,
            商品名称: r.productName || '-',
            分类: r.category || '-',
            销售渠道: r.channel || r.source || '-',
            数量: `${r.quantity || 0} ${r.unit || ''}`,
            单价: r.price ? `¥${r.price.toFixed(2)}` : '-',
            金额: `¥${(r.amount || 0).toFixed(2)}`,
            支付方式: r.paymentMethod || '-',
            客户: r.customer || '散客',
            状态: r.isPaid ? '已收款' : (r.paymentMethod === '赊账' ? '待收款' : '已收款'),
            备注: r.note || '-'
        }))

        if (data.length === 0) return ''

        const headers = Object.keys(data[0])
        const rows = data.map(item => {
            return headers.map(header => {
                let value = item[header] || ''
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`
                }
                return value
            }).join(',')
        })

        return [headers.join(','), ...rows].join('\n')
    }
}

export default new IncomeService()