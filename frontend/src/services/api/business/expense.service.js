// services/business/expense.service.js
import businessDataService from '@/services/cache/business-cache.service.js'
import baseService from './base.service.js'
import inventoryService from './inventory.service.js'
import idGeneratorService from "@/services/id-generator.service.js";
import {userDataService} from "@/services/index.js";

/**
 * 支出记账业务服务
 */
class ExpenseService {
    /**
     * 获取支出类型列表
     */
    getExpenseTypes() {
        return [
            { value: '进货采购', label: '进货采购', icon: 'fa-boxes', affectsInventory: true, effect: 'increase' },
            { value: '租金水电', label: '租金水电', icon: 'fa-building', affectsInventory: false },
            { value: '员工工资', label: '员工工资', icon: 'fa-users', affectsInventory: false },
            { value: '设备工具', label: '设备工具', icon: 'fa-tools', affectsInventory: false },
            { value: '包装物料', label: '包装物料', icon: 'fa-box', affectsInventory: false },
            { value: '运输费用', label: '运输费用', icon: 'fa-truck', affectsInventory: false },
            { value: '平台费用', label: '平台费用', icon: 'fa-mobile-alt', affectsInventory: false },
            { value: '税费杂费', label: '税费杂费', icon: 'fa-file-invoice', affectsInventory: false },
            { value: '库存损耗', label: '库存损耗', icon: 'fa-exclamation-triangle', affectsInventory: true, effect: 'decrease' },
            { value: '退货退款', label: '退货退款', icon: 'fa-undo-alt', affectsInventory: true, effect: 'decrease' },
            { value: '其他支出', label: '其他支出', icon: 'fa-tag', affectsInventory: false }
        ]
    }

    /**
     * 获取支出子类型映射
     */
    getExpenseSubtypesMap() {
        return {
            '租金水电': ['店铺租金', '仓库租金', '电费', '水费', '物业费', '网络费'],
            '员工工资': ['基本工资', '提成', '奖金', '社保', '福利', '加班费'],
            '设备工具': ['收银设备', '冷藏设备', '称重设备', '货架货柜', '维修工具', '办公设备'],
            '包装物料': ['塑料袋', '包装盒', '保鲜膜', '标签纸', '胶带', '泡沫箱'],
            '运输费用': ['油费', '停车费', '过路费', '车辆保养', '维修费', '快递费', '搬运费'],
            '平台费用': ['美团佣金', '饿了么佣金', '抖音费用', '微信费率', '支付宝费率', '推广费'],
            '税费杂费': ['增值税', '个人所得税', '工商管理费', '卫生费', '垃圾处理费', '其他杂费'],
            '库存损耗': ['自然损耗', '过期损耗', '损坏损耗', '盘点差异', '其他损耗'],
            '退货退款': ['质量退货', '客户退货', '供应商退货', '其他退货'],
            '其他支出': ['办公用品', '招待费', '捐款', '培训费', '其他']
        }
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
     * 添加支出记录
     */
    async addExpenseRecord(record) {
        if (!record.date) {
            record.date = baseService.formatDateYMD(new Date())
        }
        return businessDataService.addExpenseRecord(record)
    }

    /**
     * 获取支出记录（支持筛选）
     */
    async getExpenseRecords(filters = {}) {
        let records = await businessDataService.getAllExpenseRecords()

        if (filters.startDate && filters.endDate) {
            records = records.filter(r => r.date >= filters.startDate && r.date <= filters.endDate)
        }
        if (filters.category) records = records.filter(r => r.category === filters.category)
        if (filters.businessType) records = records.filter(r => r.businessType === filters.businessType)
        if (filters.supplierId) records = records.filter(r => r.supplierId === filters.supplierId)

        return records.sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 获取生意支出记录
     */
    async getBusinessExpenseRecords(dateRange = null) {
        const filters = { businessType: 'business' }
        if (dateRange) {
            filters.startDate = dateRange.start
            filters.endDate = dateRange.end
        }
        return this.getExpenseRecords(filters)
    }

    /**
     * 更新支出记录
     */
    async updateExpenseRecord(id, data) {
        return businessDataService.updateExpenseRecord(id, data)
    }

    /**
     * 删除支出记录
     */
    async deleteExpenseRecord(id) {
        return businessDataService.deleteExpenseRecord(id)
    }

    /**
     * 判断支出类型是否影响库存
     */
    isInventoryAffectingExpense(expenseType) {
        const types = this.getExpenseTypes()
        const type = types.find(t => t.value === expenseType)
        return type?.affectsInventory || false
    }

    /**
     * 获取支出类型对库存的影响效果
     */
    getExpenseInventoryEffect(expenseType) {
        const types = this.getExpenseTypes()
        const type = types.find(t => t.value === expenseType)
        return type?.effect || null
    }

    /**
     * 获取支出子类型列表
     */
    getExpenseSubtypes(expenseType) {
        const map = this.getExpenseSubtypesMap()
        return map[expenseType] || []
    }

    /**
     * 获取供应商占位符文本
     */
    getSupplierPlaceholder(expenseType) {
        const placeholders = {
            '进货采购': '例如：XX批发市场',
            '库存损耗': '损耗责任人 (可选)',
            '退货退款': '退货给 (供应商/客户)'
        }
        return placeholders[expenseType] || '输入供应商或收款方名称'
    }

    /**
     * 获取备注占位符文本
     */
    getNotePlaceholder(expenseType) {
        const placeholders = {
            '进货采购': '记录批次号、备注信息等',
            '库存损耗': '记录损耗原因、处理方式等',
            '退货退款': '记录退货原因、处理结果等'
        }
        return placeholders[expenseType] || '记录更多细节...'
    }

    /**
     * 获取更新库存文本
     */
    getUpdateInventoryText(expenseType) {
        const texts = {
            '进货采购': '自动更新库存 (增加库存)',
            '库存损耗': '自动更新库存 (减少库存)',
            '退货退款': '自动更新库存 (减少库存)'
        }
        return texts[expenseType] || '自动更新库存'
    }

    /**
     * 验证支出表单数据
     */
    validateExpenseForm(formData, requireSubtype = true) {
        const errors = []

        if (!formData.type) errors.push('请选择支出类型')
        if (requireSubtype && formData.type !== '进货采购' && !formData.subtype) errors.push('请选择具体项目')
        if (!formData.amount || parseFloat(formData.amount) <= 0) errors.push('请输入有效的金额')
        if (!formData.date) errors.push('请选择日期')

        return { valid: errors.length === 0, errors }
    }

    /**
     * 验证库存相关字段
     */
    validateInventoryFields(formData) {
        const errors = []

        if (!formData.productType) errors.push('请选择商品类型')
        if (!formData.inventoryProductId) errors.push('请选择商品')
        if (!formData.quantity || parseFloat(formData.quantity) <= 0) errors.push('请输入有效的数量')

        return { valid: errors.length === 0, errors }
    }

    /**
     * 检查库存是否充足
     */
    checkStockSufficiency(currentQuantity, outQuantity, minStock = 10) {
        const newQuantity = currentQuantity - outQuantity

        if (newQuantity < 0) {
            return {
                sufficient: false,
                warning: true,
                message: `库存不足！当前库存 ${currentQuantity}，出库 ${outQuantity} 后库存将为负数`,
                newQuantity
            }
        }

        if (newQuantity <= minStock) {
            return {
                sufficient: true,
                warning: true,
                message: `警告：出库后库存将低于最低库存预警 (${minStock})`,
                newQuantity
            }
        }

        return { sufficient: true, warning: false, message: null, newQuantity }
    }

    /**
     * 计算进货采购的总金额
     */
    calculatePurchaseTotal(quantity, unitPrice) {
        return (quantity || 0) * (unitPrice || 0)
    }

    /**
     * 计算损耗/退货的预估金额
     */
    calculateLossAmount(quantity, costPrice) {
        return (quantity || 0) * (costPrice || 0)
    }

    /**
     * 创建支出记录对象
     */
    createExpenseRecord(formData) {
        const record = {
            id: idGeneratorService.generateExpenseRecordId(userDataService.getCurrentUserId()),
            type: '支出',
            category: formData.type,
            subtype: formData.subtype || formData.type,
            amount: parseFloat(formData.amount),
            date: formData.date,
            supplier: formData.supplier || '无',
            paymentMethod: formData.paymentMethod,
            note: formData.note,
            businessType: 'business'
        }

        if (this.isInventoryAffectingExpense(formData.type) && formData.selectedProduct) {
            record.inventoryProductId = formData.selectedProduct.id
            record.inventoryProductName = formData.selectedProduct.name
            record.inventoryCategory = formData.selectedProduct.category
            record.quantity = parseFloat(formData.quantity)
            record.unit = formData.unit
            record.unitPrice = formData.unitPrice ? parseFloat(formData.unitPrice) : null

            if (formData.type === '库存损耗') record.lossReason = formData.lossReason || '其他'
            if (formData.type === '退货退款') record.returnReason = formData.returnReason || '其他'
        }

        return record
    }

    /**
     * 处理进货采购的库存更新
     */
    processPurchaseInventoryUpdate(inventoryItem, product, quantity, unitPrice, supplier) {
        if (inventoryItem) {
            const currentQuantity = inventoryItem.quantity || 0
            const currentCost = inventoryItem.costPrice || 0
            const newQuantity = currentQuantity + quantity
            const totalCost = currentCost * currentQuantity + unitPrice * quantity
            const newCostPrice = totalCost / newQuantity

            return {
                exists: true,
                id: inventoryItem.id,
                quantity: newQuantity,
                costPrice: newCostPrice,
                supplier: supplier || inventoryItem.supplier,
                updateTime: new Date().toISOString()
            }
        } else {
            return {
                exists: false,
                productId: product.id,
                productName: product.name,
                category: product.category,
                quantity: quantity,
                unit: product.unit || '斤',
                costPrice: unitPrice,
                sellingPrice: product.defaultPrice || null,
                supplier: supplier || null,
                location: '',
                minStock: 10,
                expiryDate: '',
                note: '首次采购入库'
            }
        }
    }

    /**
     * 处理损耗/退货的库存更新
     */
    processLossInventoryUpdate(inventoryItem, quantity) {
        if (!inventoryItem) return { error: '商品不存在库存记录' }

        const newQuantity = Math.max(0, (inventoryItem.quantity || 0) - quantity)

        return {
            exists: true,
            id: inventoryItem.id,
            quantity: newQuantity,
            updateTime: new Date().toISOString()
        }
    }

    /**
     * 更新供应商历史记录
     */
    updateSupplierHistory(history, supplier) {
        if (supplier && !history.includes(supplier)) {
            return [...history, supplier]
        }
        return history
    }

    /**
     * 格式化支出成功消息
     */
    formatExpenseSuccessMessage(formData, inventoryUpdated) {
        let message = `支出记录成功：${formData.subtype || formData.type} ¥${parseFloat(formData.amount).toFixed(2)}`
        if (inventoryUpdated) message += `，库存已更新`
        return message
    }

    /**
     * 获取损耗原因选项
     */
    getLossReasons() {
        return ['自然损耗', '过期损耗', '损坏损耗', '盘点差异', '其他']
    }

    /**
     * 获取退货原因选项
     */
    getReturnReasons() {
        return ['质量退货', '客户退货', '供应商退货', '其他退货']
    }
}

export default new ExpenseService()