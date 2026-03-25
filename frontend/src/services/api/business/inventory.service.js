// services/business/inventory.service.js
import businessDataService from '@/services/cache/business-cache.service.js'
import baseService from './base.service.js'

/**
 * 库存管理业务服务
 * 只包含业务逻辑，数据库操作全部委托给 businessDataService
 */
class InventoryService {
    /**
     * 添加库存项
     */
    async addInventoryItem(item) {
        if (!item.productId) throw new Error('商品ID不能为空')
        if (item.quantity === undefined) item.quantity = 0
        return businessDataService.addInventoryItem(item)
    }

    /**
     * 批量添加库存项
     */
    async addInventoryItems(items) {
        for (const item of items) {
            if (!item.productId) throw new Error('商品ID不能为空')
            if (item.quantity === undefined) item.quantity = 0
        }
        return businessDataService.addInventoryItems(items)
    }

    /**
     * 获取所有库存项（带商品信息）
     */
    async getAllInventory() {
        const items = await businessDataService.getAllInventory()
        const products = await businessDataService.getAllProducts()
        const productMap = new Map(products.map(p => [p.id, p]))

        return items.map(item => ({
            ...item,
            productName: productMap.get(item.productId)?.name || '未知商品',
            category: productMap.get(item.productId)?.category || '未分类',
            unit: productMap.get(item.productId)?.unit || '个',
            product: productMap.get(item.productId) || null
        }))
    }

    /**
     * 获取低库存预警列表
     */
    async getLowStockItems(threshold = 10) {
        const items = await this.getAllInventory()
        return items.filter(i => i.quantity <= threshold)
    }

    /**
     * 获取临期商品列表
     */
    async getExpiringItems(days = 7) {
        const items = await this.getAllInventory()
        const today = new Date()
        const futureDate = new Date()
        futureDate.setDate(today.getDate() + days)
        futureDate.setHours(23, 59, 59, 999)

        return items.filter(i => {
            if (!i.expiryDate) return false
            const expiry = new Date(i.expiryDate)
            expiry.setHours(0, 0, 0, 0)
            today.setHours(0, 0, 0, 0)
            return expiry >= today && expiry <= futureDate
        })
    }

    /**
     * 获取过期商品列表
     */
    async getExpiredItems() {
        const items = await this.getAllInventory()
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return items.filter(i => {
            if (!i.expiryDate) return false
            const expiry = new Date(i.expiryDate)
            expiry.setHours(0, 0, 0, 0)
            return expiry < today
        })
    }

    /**
     * 更新库存数量
     */
    async updateStockQuantity(id, quantity, operation = 'set') {
        const item = await businessDataService.getInventoryItemById(id)
        if (!item) return false

        let newQuantity
        switch (operation) {
            case 'add':
                newQuantity = (item.quantity || 0) + quantity
                break
            case 'subtract':
                newQuantity = Math.max(0, (item.quantity || 0) - quantity)
                break
            default:
                newQuantity = quantity
        }

        return businessDataService.updateInventoryItem(id, { quantity: newQuantity })
    }

    /**
     * 入库操作
     */
    async stockIn(productId, quantity, price, note = '', supplier = null) {
        if (!productId) throw new Error('商品ID不能为空')
        if (!quantity || quantity <= 0) throw new Error('入库数量必须大于0')

        const existingItems = await businessDataService.getInventoryByProductId(productId)

        if (existingItems.length > 0) {
            const item = existingItems[0]
            const currentQuantity = item.quantity || 0
            const currentCost = item.costPrice || 0
            const newQuantity = currentQuantity + quantity

            // 计算新的平均成本价
            const totalCost = (currentCost * currentQuantity) + (price * quantity)
            const newCostPrice = newQuantity > 0 ? totalCost / newQuantity : price

            await businessDataService.updateInventoryItem(item.id, {
                quantity: newQuantity,
                costPrice: newCostPrice,
                supplier: supplier || item.supplier,
                updateTime: new Date().toISOString()
            })
        } else {
            await businessDataService.addInventoryItem({
                productId,
                quantity,
                costPrice: price,
                supplier: supplier,
                note,
                createTime: new Date().toISOString()
            })
        }

        // 记录采购历史
        await businessDataService.addPurchaseHistory({
            productId,
            quantity,
            price,
            type: 'stock_in',
            note,
            purchaseDate: baseService.formatDateYMD(new Date()),
            supplier: supplier
        })

        return true
    }

    /**
     * 出库操作
     */
    async stockOut(productId, quantity, note = '') {
        if (!productId) throw new Error('商品ID不能为空')
        if (!quantity || quantity <= 0) throw new Error('出库数量必须大于0')

        const items = await businessDataService.getInventoryByProductId(productId)

        if (items.length === 0) throw new Error('商品库存不足')

        const item = items[0]
        if ((item.quantity || 0) < quantity) throw new Error('库存不足，无法出库')

        const newQuantity = (item.quantity || 0) - quantity
        await businessDataService.updateInventoryItem(item.id, { quantity: newQuantity })

        await businessDataService.addPurchaseHistory({
            productId,
            quantity,
            type: 'stock_out',
            note,
            purchaseDate: baseService.formatDateYMD(new Date())
        })

        return true
    }

    /**
     * 获取库存统计数据
     */
    async getInventoryStats() {
        const inventory = await this.getAllInventory()
        const items = inventory || []

        return {
            total: items.length,
            totalValue: this.calculateInventoryValue(items),
            lowStock: items.filter(item => this.isLowStock(item)).length,
            expiring: items.filter(item => this.isExpiring(item.expiryDate)).length,
            expired: items.filter(item => this.isExpired(item.expiryDate)).length,
            outOfStock: items.filter(item => (item.quantity || 0) === 0).length
        }
    }

    /**
     * 判断是否为低库存
     */
    isLowStock(item, defaultMinStock = 10) {
        const minStock = item.minStock || defaultMinStock
        return (item.quantity || 0) <= minStock
    }

    /**
     * 判断是否即将过期
     */
    isExpiring(expiryDate, days = 7) {
        if (!expiryDate) return false
        const expiry = new Date(expiryDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const future = new Date()
        future.setDate(today.getDate() + days)
        future.setHours(23, 59, 59, 999)
        return expiry >= today && expiry <= future
    }

    /**
     * 判断是否已过期
     */
    isExpired(expiryDate) {
        if (!expiryDate) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const expiry = new Date(expiryDate)
        expiry.setHours(0, 0, 0, 0)
        return expiry < today
    }

    /**
     * 筛选库存记录
     */
    filterInventory(inventory, filters = {}) {
        let filtered = [...inventory]
        const { keyword, category, supplier, location, status } = filters

        if (keyword && keyword.trim()) {
            const searchTerm = keyword.toLowerCase().trim()
            filtered = filtered.filter(item =>
                item.productName?.toLowerCase().includes(searchTerm) ||
                item.category?.toLowerCase().includes(searchTerm) ||
                (item.supplier && item.supplier.toLowerCase().includes(searchTerm))
            )
        }

        if (category && category !== '全部') {
            filtered = filtered.filter(item => item.category === category)
        }

        if (supplier) {
            filtered = filtered.filter(item => item.supplier === supplier)
        }

        if (location) {
            filtered = filtered.filter(item => item.location === location)
        }

        if (status && status !== 'all') {
            switch (status) {
                case 'low':
                    filtered = filtered.filter(item => this.isLowStock(item))
                    break
                case 'expiring':
                    filtered = filtered.filter(item => this.isExpiring(item.expiryDate))
                    break
                case 'expired':
                    filtered = filtered.filter(item => this.isExpired(item.expiryDate))
                    break
                case 'outOfStock':
                    filtered = filtered.filter(item => (item.quantity || 0) === 0)
                    break
            }
        }

        return filtered
    }

    /**
     * 获取库存项的预警状态
     */
    getInventoryStatus(item) {
        if (this.isExpired(item.expiryDate)) return 'expired'
        if (this.isExpiring(item.expiryDate)) return 'expiring'
        if (this.isLowStock(item)) return 'low'
        if ((item.quantity || 0) === 0) return 'outOfStock'
        return 'normal'
    }

    /**
     * 获取库存项的状态样式类名
     */
    getInventoryStatusClass(item) {
        const status = this.getInventoryStatus(item)
        const classMap = {
            expired: 'expired',
            expiring: 'expiring',
            low: 'low-stock',
            outOfStock: 'out-of-stock',
            normal: ''
        }
        return classMap[status] || ''
    }

    /**
     * 获取库存项的预警标签文本
     */
    getInventoryBadgeText(item) {
        if (this.isExpired(item.expiryDate)) return '已过期'
        if (this.isExpiring(item.expiryDate)) return '即将过期'
        if (this.isLowStock(item)) return '低库存'
        if ((item.quantity || 0) === 0) return '缺货'
        return ''
    }

    /**
     * 获取所有唯一的供应商列表
     */
    getUniqueSuppliers(inventory) {
        return [...new Set(inventory.map(i => i.supplier).filter(Boolean))]
    }

    /**
     * 获取所有唯一的存放位置列表
     */
    getUniqueLocations(inventory) {
        return [...new Set(inventory.map(i => i.location).filter(Boolean))]
    }

    /**
     * 库存调整
     */
    async adjustInventory(item, type, quantity, adjustData = {}) {
        if (!item || !item.id) throw new Error('库存项不存在')

        const adjustQuantity = parseFloat(quantity)
        if (adjustQuantity <= 0) throw new Error('调整数量必须大于0')

        const currentQuantity = item.quantity || 0
        let newQuantity

        if (type === 'in') {
            newQuantity = currentQuantity + adjustQuantity
        } else if (type === 'out') {
            if (adjustQuantity > currentQuantity) {
                throw new Error(`出库数量不能大于当前库存（当前库存：${currentQuantity} ${item.unit}）`)
            }
            newQuantity = currentQuantity - adjustQuantity
        } else {
            throw new Error('无效的调整类型')
        }

        await businessDataService.updateInventoryItem(item.id, {
            quantity: newQuantity,
            updateTime: new Date().toISOString()
        })

        const historyRecord = {
            id: Date.now(),
            type,
            adjustType: adjustData.adjustType || (type === 'in' ? '采购入库' : '销售出库'),
            quantity: adjustQuantity,
            beforeQuantity: currentQuantity,
            afterQuantity: newQuantity,
            date: adjustData.date || baseService.formatDateYMD(new Date()),
            note: adjustData.note || '',
            timestamp: new Date().toISOString()
        }

        await this.recordInventoryHistory(item.id, historyRecord)

        return { ...item, quantity: newQuantity }
    }

    /**
     * 记录库存历史
     */
    async recordInventoryHistory(inventoryId, record) {
        // 使用 localStorage 存储历史记录，因为历史数据量大且不需要跨设备同步
        const historyKey = `inventory_history_${inventoryId}`
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]')
        history.push(record)
        localStorage.setItem(historyKey, JSON.stringify(history))
    }

    /**
     * 获取库存历史记录
     */
    async getInventoryHistory(inventoryId) {
        const historyKey = `inventory_history_${inventoryId}`
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]')
        return history.sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 计算库存总值
     */
    calculateInventoryValue(inventory) {
        return inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.costPrice || 0)), 0)
    }

    /**
     * 按分类统计库存
     */
    getInventoryByCategory(inventory) {
        const stats = {}
        inventory.forEach(item => {
            const category = item.category || '未分类'
            if (!stats[category]) {
                stats[category] = { quantity: 0, value: 0, count: 0 }
            }
            stats[category].quantity += item.quantity || 0
            stats[category].value += (item.quantity || 0) * (item.costPrice || 0)
            stats[category].count++
        })
        return stats
    }

    /**
     * 获取需要补货的商品列表
     */
    getRestockList(inventory, threshold = 1.5) {
        return inventory
            .filter(item => {
                const minStock = item.minStock || 10
                return (item.quantity || 0) < minStock * threshold
            })
            .sort((a, b) => {
                const aNeed = (a.minStock || 10) - (a.quantity || 0)
                const bNeed = (b.minStock || 10) - (b.quantity || 0)
                return bNeed - aNeed
            })
            .map(item => ({
                ...item,
                suggestedQuantity: Math.ceil(((item.minStock || 10) - (item.quantity || 0)) * 1.2)
            }))
    }

    /**
     * 获取即将过期商品列表（带剩余天数）
     */
    getExpiringItemsWithDays(inventory, days = 7) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        return inventory
            .filter(item => {
                if (!item.expiryDate) return false
                const expiry = new Date(item.expiryDate)
                expiry.setHours(0, 0, 0, 0)
                const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
                return daysLeft > 0 && daysLeft <= days
            })
            .sort((a, b) => {
                const daysA = Math.ceil((new Date(a.expiryDate) - today) / (1000 * 60 * 60 * 24))
                const daysB = Math.ceil((new Date(b.expiryDate) - today) / (1000 * 60 * 60 * 24))
                return daysA - daysB
            })
            .map(item => ({
                ...item,
                daysLeft: Math.ceil((new Date(item.expiryDate) - today) / (1000 * 60 * 60 * 24))
            }))
    }

    /**
     * 导出库存数据为CSV
     */
    exportInventoryToCSV(inventory) {
        const data = inventory.map(item => ({
            商品名称: item.productName,
            分类: item.category,
            库存量: `${item.quantity || 0} ${item.unit}`,
            最低库存: item.minStock ? `${item.minStock} ${item.unit}` : '-',
            成本价: item.costPrice ? `¥${item.costPrice.toFixed(2)}` : '-',
            售价: item.sellingPrice ? `¥${item.sellingPrice.toFixed(2)}` : '-',
            供应商: item.supplier || '-',
            存放位置: item.location || '-',
            保质期: item.expiryDate || '-',
            状态: this.getInventoryStatus(item),
            备注: item.note || '-'
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

    /**
     * 获取库存调整类型选项
     */
    getAdjustTypes() {
        return [
            { value: '采购入库', label: '采购入库', type: 'in' },
            { value: '销售出库', label: '销售出库', type: 'out' },
            { value: '盘点调整', label: '盘点调整', type: 'both' },
            { value: '报损出库', label: '报损出库', type: 'out' },
            { value: '退货入库', label: '退货入库', type: 'in' }
        ]
    }

    /**
     * 获取库存统计卡片配置
     */
    getInventoryStatCards() {
        return [
            { key: 'total', label: '总商品数', color: '#3498db', status: 'all' },
            { key: 'lowStock', label: '低库存', color: '#f39c12', status: 'low' },
            { key: 'expiring', label: '临期(7天)', color: '#f1c40f', status: 'expiring' },
            { key: 'expired', label: '已过期', color: '#e74c3c', status: 'expired' },
            { key: 'outOfStock', label: '缺货', color: '#95a5a6', status: 'outOfStock' }
        ]
    }

    /**
     * 验证库存调整数量
     */
    validateAdjustQuantity(item, type, quantity) {
        const adjustQuantity = parseFloat(quantity)

        if (isNaN(adjustQuantity) || adjustQuantity <= 0) {
            return { valid: false, message: '请输入有效的数量' }
        }

        if (type === 'out') {
            const currentQuantity = item.quantity || 0
            if (adjustQuantity > currentQuantity) {
                return {
                    valid: false,
                    message: `出库数量不能大于当前库存（当前库存：${currentQuantity} ${item.unit}）`
                }
            }
        }

        return { valid: true }
    }

    /**
     * 获取商品库存状态样式类名
     */
    getStockStatusClass(inventoryItem, defaultMinStock = 10) {
        if (!inventoryItem) return 'warning'
        const quantity = inventoryItem.quantity || 0
        const minStock = inventoryItem.minStock || defaultMinStock

        if (quantity <= 0) return 'danger'
        if (quantity <= minStock) return 'warning'
        return 'normal'
    }

    /**
     * 获取保质期状态样式类名
     */
    getExpiryStatusClass(expiryDate) {
        if (this.isExpired(expiryDate)) return 'expired'
        if (this.isExpiring(expiryDate)) return 'expiring'
        return ''
    }

    /**
     * 获取保质期状态详情
     */
    getExpiryStatus(expiryDate) {
        if (!expiryDate) {
            return { status: 'unknown', icon: 'fa-question-circle', message: '未设置', daysLeft: null }
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const expiry = new Date(expiryDate)
        expiry.setHours(0, 0, 0, 0)
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))

        if (expiry < today) {
            return { status: 'expired', icon: 'fa-times-circle', message: '已过期', daysLeft }
        }
        if (daysLeft <= 7) {
            return { status: 'expiring', icon: 'fa-exclamation-circle', message: `即将过期 (${daysLeft}天)`, daysLeft }
        }
        return { status: 'good', icon: 'fa-check-circle', message: `剩余${daysLeft}天`, daysLeft }
    }

    /**
     * 获取库存状态样式类名（收入记账用）
     */
    getInventoryStatusClassForIncome(inventory) {
        if (!inventory) return ''
        const quantity = inventory.quantity || 0
        const minStock = inventory.minStock || 10

        if (quantity <= 0) return 'out-of-stock'
        if (quantity <= minStock) return 'low-stock'
        return 'normal'
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
     * 检查库存是否充足
     */
    isStockSufficient(inventory, quantity) {
        if (!inventory) return true
        return (inventory.quantity || 0) >= parseFloat(quantity)
    }

    /**
     * 获取库存预警消息
     */
    getInventoryAlertMessages(inventory) {
        const messages = []

        inventory.forEach(item => {
            if (this.isLowStock(item)) {
                messages.push({
                    type: 'warning',
                    productName: item.productName,
                    message: `${item.productName} 库存不足，当前库存：${item.quantity} ${item.unit}，最低库存：${item.minStock || 10} ${item.unit}`
                })
            }

            if (this.isExpiring(item.expiryDate)) {
                const daysLeft = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                messages.push({
                    type: 'info',
                    productName: item.productName,
                    message: `${item.productName} 即将过期，剩余 ${daysLeft} 天`
                })
            }

            if (this.isExpired(item.expiryDate)) {
                messages.push({
                    type: 'danger',
                    productName: item.productName,
                    message: `${item.productName} 已过期，请及时处理`
                })
            }
        })

        return messages
    }

    /**
     * 批量更新库存
     */
    async batchUpdateInventory(updates) {
        const results = { success: [], failed: [] }

        for (const update of updates) {
            try {
                const { id, quantity, operation } = update
                await this.updateStockQuantity(id, quantity, operation)
                results.success.push(update)
            } catch (error) {
                results.failed.push({ ...update, error: error.message })
            }
        }

        return results
    }

    /**
     * 获取库存周转率
     */
    async getInventoryTurnoverRate(days = 30) {
        const inventory = await this.getAllInventory()
        const incomeRecords = await businessDataService.getAllIncomeRecords()

        const startDate = baseService.addDays(baseService.formatDateYMD(new Date()), -days)
        const recentSales = incomeRecords.filter(r =>
            r.businessType === 'business' &&
            r.date >= startDate &&
            r.productId
        )

        const salesByProduct = {}
        recentSales.forEach(sale => {
            if (!salesByProduct[sale.productId]) {
                salesByProduct[sale.productId] = 0
            }
            salesByProduct[sale.productId] += sale.quantity || 0
        })

        const turnoverRates = inventory.map(item => {
            const salesQuantity = salesByProduct[item.productId] || 0
            const avgInventory = item.quantity || 0
            const turnoverRate = avgInventory > 0 ? salesQuantity / avgInventory : 0

            return {
                productName: item.productName,
                salesQuantity,
                avgInventory,
                turnoverRate
            }
        })

        return turnoverRates.sort((a, b) => b.turnoverRate - a.turnoverRate)
    }
}

export default new InventoryService()