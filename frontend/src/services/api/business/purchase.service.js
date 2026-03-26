// services/business/purchase.service.js
import businessDataService from '@/services/cache/business-cache.service.js'
import baseService from './base.service.js'
import inventoryService from './inventory.service.js'

/**
 * 采购管理业务服务
 * 只包含业务逻辑，数据库操作全部委托给 businessDataService
 */
class PurchaseService {
    /**
     * 获取所有采购订单
     */
    async getAllPurchaseOrders() {
        return businessDataService.getAllPurchaseOrders()
    }

    /**
     * 添加采购订单
     */
    async addPurchaseOrder(orderData) {
        if (!orderData.orderNo) throw new Error('订单号不能为空')
        if (!orderData.supplierId) throw new Error('供应商不能为空')
        if (!orderData.items || orderData.items.length === 0) throw new Error('请至少添加一个商品')

        const totalAmount = this.calculateOrderTotal(orderData.items)

        const newOrder = {
            ...orderData,
            totalAmount,
            status: orderData.status || 'pending'
        }

        return businessDataService.addPurchaseOrder(newOrder)
    }

    /**
     * 批量添加采购订单
     */
    async addPurchaseOrders(orders) {
        const newOrders = []
        for (const order of orders) {
            const orderId = idGenerator.generatePurchaseOrderId(this.getCurrentUserId())
            const newOrder = this.addUserIdentifier({
                ...order,
                id: order.id || orderId,
                status: order.status || 'pending'
            })
            newOrders.push(newOrder)
        }
        return indexedDBService.bulkAdd('purchase_orders', newOrders)
    }

    /**
     * 更新采购订单
     */
    async updatePurchaseOrder(orderId, orderData) {
        if (!orderId) throw new Error('订单ID不能为空')

        // 如果更新了商品，重新计算总金额
        if (orderData.items) {
            orderData.totalAmount = this.calculateOrderTotal(orderData.items)
        }

        return businessDataService.updatePurchaseOrder(orderId, orderData)
    }

    /**
     * 删除采购订单
     */
    async deletePurchaseOrder(orderId) {
        if (!orderId) throw new Error('订单ID不能为空')

        const order = await businessDataService.getPurchaseOrderById(orderId)
        if (order && order.status === 'completed') {
            throw new Error('已完成订单不能删除')
        }

        return businessDataService.deletePurchaseOrder(orderId)
    }

    /**
     * 获取采购历史记录
     */
    async getPurchaseHistory() {
        return businessDataService.getAllPurchaseHistory()
    }

    /**
     * 确认收货（核心业务逻辑）
     * @param {Object} order - 采购订单
     * @param {Array} products - 商品列表
     * @param {Array} suppliers - 供应商列表
     * @param {Function} onExpenseCreated - 支出记录创建回调（用于解耦 expenseService）
     * @returns {Promise<Object>} 收货结果
     */
    async receivePurchaseOrder(order, products = [], suppliers = [], onExpenseCreated = null) {
        if (!order || !order.id) throw new Error('订单不存在')
        if (order.status === 'completed') throw new Error('订单已完成，不能重复收货')

        const receiveDate = baseService.formatDateYMD(new Date())
        const results = {
            inventoryUpdated: [],
            historyRecords: [],
            supplierUpdated: false,
            expenseRecords: []
        }

        // 1. 更新订单状态
        await businessDataService.updatePurchaseOrder(order.id, {
            status: 'completed',
            receiveDate
        })

        // 2. 更新库存并记录采购历史
        for (const item of order.items || []) {
            const cleanItem = {
                productId: item.productId,
                productName: item.productName,
                quantity: parseFloat(item.quantity),
                price: parseFloat(item.price),
                unit: item.unit || '斤',
                category: item.category
            }

            // 更新库存
            const inventoryUpdate = await inventoryService.stockIn(
                cleanItem.productId,
                cleanItem.quantity,
                cleanItem.price,
                `采购订单: ${order.orderNo}`
            )
            results.inventoryUpdated.push(inventoryUpdate)

            // 记录采购历史
            const historyRecord = await this._recordPurchaseHistory(cleanItem, order, receiveDate)
            results.historyRecords.push(historyRecord)

            // 准备支出记录数据（不直接创建，通过回调让上层处理）
            const expenseData = {
                type: '支出',
                category: '进货采购',
                subtype: '采购入库',
                amount: cleanItem.price * cleanItem.quantity,
                date: receiveDate,
                supplier: this.getSupplierName(suppliers, order.supplierId),
                paymentMethod: order.paymentMethod || '赊账',
                note: `采购订单: ${order.orderNo} - ${cleanItem.productName}`,
                businessType: 'business',
                inventoryProductId: cleanItem.productId,
                inventoryProductName: cleanItem.productName,
                inventoryCategory: cleanItem.category,
                quantity: cleanItem.quantity,
                unit: cleanItem.unit,
                unitPrice: cleanItem.price,
                purchaseOrderId: order.id,
                purchaseOrderNo: order.orderNo
            }

            results.expenseRecords.push(expenseData)

            // 如果提供了回调，创建支出记录
            if (onExpenseCreated) {
                await onExpenseCreated(expenseData)
            }
        }

        // 3. 更新供应商采购统计
        await this._updateSupplierPurchaseStats(order.supplierId, order)
        results.supplierUpdated = true

        return results
    }

    /**
     * 记录采购历史（内部方法）
     */
    async _recordPurchaseHistory(item, order, receiveDate) {
        const historyData = {
            orderId: order.id,
            orderNo: order.orderNo,
            supplierId: order.supplierId,
            productId: item.productId,
            productName: item.productName,
            quantity: parseFloat(item.quantity),
            unit: item.unit || '斤',
            price: parseFloat(item.price),
            totalAmount: parseFloat(item.price) * parseFloat(item.quantity),
            purchaseDate: receiveDate,
            createTime: new Date().toISOString()
        }

        return businessDataService.addPurchaseHistory(historyData)
    }

    /**
     * 更新供应商采购统计（内部方法）
     */
    async _updateSupplierPurchaseStats(supplierId, order) {
        const supplier = await businessDataService.getSupplierById(supplierId)
        if (supplier) {
            const totalAmount = order.totalAmount || this.calculateOrderTotal(order.items)

            await businessDataService.updateSupplier(supplierId, {
                ...supplier,
                purchaseCount: (supplier.purchaseCount || 0) + 1,
                totalAmount: (supplier.totalAmount || 0) + totalAmount,
                lastPurchaseDate: baseService.formatDateYMD(new Date()),
                updateTime: new Date().toISOString()
            })
        }
    }

    /**
     * 批量收货
     */
    async receivePurchaseOrders(orders, products = [], suppliers = [], onExpenseCreated = null) {
        const results = []
        for (const order of orders) {
            if (order.status !== 'pending') continue
            const result = await this.receivePurchaseOrder(order, products, suppliers, onExpenseCreated)
            results.push(result)
        }
        return results
    }

    /**
     * 获取采购订单统计数据
     */
    getPurchaseOrderStats(orders) {
        const totalOrders = orders.length
        const pendingOrders = orders.filter(o => o.status === 'pending').length
        const completedOrders = orders.filter(o => o.status === 'completed').length
        const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

        return { totalOrders, pendingOrders, completedOrders, totalAmount }
    }

    /**
     * 筛选采购订单
     */
    filterPurchaseOrders(orders, filters = {}, getSupplierName = (id) => '') {
        let filtered = [...orders]
        const { status, keyword } = filters

        if (status && status !== 'all') {
            filtered = filtered.filter(o => o.status === status)
        }

        if (keyword && keyword.trim()) {
            const searchTerm = keyword.toLowerCase().trim()
            filtered = filtered.filter(o =>
                o.orderNo.toLowerCase().includes(searchTerm) ||
                getSupplierName(o.supplierId).toLowerCase().includes(searchTerm) ||
                (o.note && o.note.toLowerCase().includes(searchTerm))
            )
        }

        return filtered.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
    }

    /**
     * 筛选采购历史
     */
    filterPurchaseHistory(history, filters = {}, getSupplierName = (id) => '') {
        let filtered = [...history]
        const { supplierId, startDate, endDate, keyword } = filters

        if (supplierId && supplierId !== 'all') {
            filtered = filtered.filter(h => h.supplierId === supplierId)
        }
        if (startDate) {
            filtered = filtered.filter(h => h.purchaseDate >= startDate)
        }
        if (endDate) {
            filtered = filtered.filter(h => h.purchaseDate <= endDate)
        }

        if (keyword && keyword.trim()) {
            const searchTerm = keyword.toLowerCase().trim()
            filtered = filtered.filter(h =>
                h.productName.toLowerCase().includes(searchTerm) ||
                h.orderNo.toLowerCase().includes(searchTerm) ||
                getSupplierName(h.supplierId).toLowerCase().includes(searchTerm)
            )
        }

        return filtered.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))
    }

    /**
     * 获取供应商名称
     */
    getSupplierName(suppliers, supplierId) {
        const supplier = suppliers.find(s => s.id === supplierId)
        return supplier?.name || '未知供应商'
    }

    /**
     * 生成订单号
     */
    generateOrderNo() {
        const date = new Date()
        const year = date.getFullYear().toString().slice(-2)
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        return `PO${year}${month}${day}${random}`
    }

    /**
     * 创建空的订单商品项
     */
    createEmptyOrderItem() {
        return {
            productId: '',
            productName: '',
            quantity: '',
            price: '',
            unit: '斤',
            category: ''
        }
    }

    /**
     * 验证订单表单
     */
    validateOrderForm(orderForm) {
        const errors = []

        if (!orderForm.orderNo) errors.push('订单号不能为空')
        if (!orderForm.supplierId) errors.push('请选择供应商')
        if (!orderForm.items || orderForm.items.length === 0) errors.push('请至少添加一个商品')

        for (let i = 0; i < (orderForm.items || []).length; i++) {
            const item = orderForm.items[i]
            if (!item.productId) errors.push(`第${i + 1}个商品未选择`)
            if (!item.quantity || parseFloat(item.quantity) <= 0) errors.push(`第${i + 1}个商品数量无效`)
            if (!item.price || parseFloat(item.price) <= 0) errors.push(`第${i + 1}个商品单价无效`)
        }

        return { valid: errors.length === 0, errors }
    }

    /**
     * 计算订单总金额
     */
    calculateOrderTotal(items) {
        return items.reduce((sum, item) => {
            return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)
        }, 0)
    }

    /**
     * 获取订单状态文本
     */
    getOrderStatusText(status) {
        const statusMap = {
            pending: '待处理',
            completed: '已完成',
            cancelled: '已取消'
        }
        return statusMap[status] || status
    }

    /**
     * 判断订单是否延迟
     */
    isOrderDelayed(expectedDate) {
        if (!expectedDate) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const expected = new Date(expectedDate)
        expected.setHours(0, 0, 0, 0)
        return expected < today
    }

    /**
     * 获取结算方式选项
     */
    getPaymentTerms() {
        return ['现结', '周结', '月结', '季结', '年结']
    }

    /**
     * 导出采购订单为CSV
     */
    exportPurchaseOrdersToCSV(orders, getSupplierName = (id) => '') {
        if (orders.length === 0) return ''

        const headers = ['订单号', '供应商', '采购日期', '预计送达', '商品种类', '订单总额', '状态', '备注']
        const rows = orders.map(o => [
            o.orderNo,
            getSupplierName(o.supplierId),
            baseService.formatDisplayDate(o.orderDate),
            baseService.formatDisplayDate(o.expectedDate),
            o.items?.length || 0,
            `¥${baseService.formatNumber(o.totalAmount || 0)}`,
            this.getOrderStatusText(o.status),
            o.note || '-'
        ])

        const escapeCSV = (value) => {
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`
            }
            return value
        }

        const csvRows = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(escapeCSV).join(','))
        ]

        return csvRows.join('\n')
    }

    /**
     * 获取供应商采购统计
     */
    getSupplierPurchaseStats(orders, supplierId) {
        const supplierOrders = orders.filter(o => o.supplierId === supplierId)
        const totalOrders = supplierOrders.length
        const completedOrders = supplierOrders.filter(o => o.status === 'completed').length
        const totalAmount = supplierOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
        const lastOrderDate = supplierOrders.length > 0
            ? supplierOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))[0].orderDate
            : null

        return { totalOrders, completedOrders, totalAmount, lastOrderDate }
    }
}

export default new PurchaseService()