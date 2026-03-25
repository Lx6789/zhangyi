// services/business/product.service.js
import businessDataService from '@/services/cache/business-cache.service.js'
import baseService from './base.service.js'

/**
 * 商品管理业务服务
 * 只包含业务逻辑，数据库操作全部委托给 businessDataService
 */
class ProductService {
    /**
     * 获取所有商品列表
     */
    async getAllProducts() {
        return businessDataService.getAllProducts()
    }

    /**
     * 添加商品
     */
    async addProduct(productData) {
        if (!productData.name) throw new Error('商品名称不能为空')
        if (!productData.category) throw new Error('商品分类不能为空')
        if (!productData.unit) throw new Error('商品单位不能为空')
        return businessDataService.addProduct(productData)
    }

    /**
     * 批量添加商品
     */
    async addProducts(productsData) {
        for (const product of productsData) {
            if (!product.name) throw new Error('商品名称不能为空')
            if (!product.category) throw new Error('商品分类不能为空')
            if (!product.unit) throw new Error('商品单位不能为空')
        }
        return businessDataService.addProducts(productsData)
    }

    /**
     * 更新商品
     */
    async updateProduct(productId, productData) {
        if (!productId) throw new Error('商品ID不能为空')
        return businessDataService.updateProduct(productId, productData)
    }

    /**
     * 删除商品
     */
    async deleteProduct(productId) {
        if (!productId) throw new Error('商品ID不能为空')

        const inventory = await businessDataService.getAllInventory()
        const hasInventory = inventory.some(item => item.productId === productId)
        if (hasInventory) throw new Error('该商品存在库存记录，无法删除')

        const incomeRecords = await businessDataService.getAllIncomeRecords()
        const hasIncomeRecords = incomeRecords.some(record => record.productId === productId)
        if (hasIncomeRecords) throw new Error('该商品存在销售记录，无法删除')

        const expenseRecords = await businessDataService.getAllExpenseRecords()
        const hasExpenseRecords = expenseRecords.some(record => record.productId === productId)
        if (hasExpenseRecords) throw new Error('该商品存在采购记录，无法删除')

        return businessDataService.deleteProduct(productId)
    }

    /**
     * 筛选商品
     */
    filterProducts(products, filters = {}) {
        let filtered = [...products]
        const { keyword, category } = filters

        if (category && category !== '全部') {
            filtered = filtered.filter(p => p.category === category)
        }

        if (keyword && keyword.trim()) {
            const searchTerm = keyword.toLowerCase().trim()
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchTerm) ||
                p.category.toLowerCase().includes(searchTerm) ||
                (p.description && p.description.toLowerCase().includes(searchTerm))
            )
        }

        return filtered
    }

    /**
     * 获取商品分类列表
     */
    getProductCategories(products) {
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
        return categories.sort()
    }

    /**
     * 获取商品单位列表
     */
    getProductUnits() {
        return ['斤', '公斤', '个', '份', '箱', '袋', '瓶', '包', '盒', '件', '条', '只']
    }

    /**
     * 获取商品表单默认值
     */
    getProductFormDefault() {
        return { name: '', category: '', unit: '', defaultPrice: null, description: '' }
    }

    /**
     * 验证商品表单数据
     */
    validateProductForm(formData) {
        const errors = []

        if (!formData.name || !formData.name.trim()) errors.push('商品名称不能为空')
        if (!formData.category || !formData.category.trim()) errors.push('商品分类不能为空')
        if (!formData.unit || !formData.unit.trim()) errors.push('商品单位不能为空')

        if (formData.defaultPrice !== null && formData.defaultPrice !== '') {
            const price = parseFloat(formData.defaultPrice)
            if (isNaN(price) || price < 0) errors.push('参考售价必须为有效的正数')
        }

        return { valid: errors.length === 0, errors }
    }

    /**
     * 获取商品的显示信息
     */
    getProductOptions(products) {
        return products.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            unit: p.unit,
            price: p.defaultPrice,
            label: `${p.name} (${p.unit})`
        }))
    }

    /**
     * 按分类分组商品
     */
    groupProductsByCategory(products) {
        const grouped = {}
        products.forEach(product => {
            const category = product.category || '未分类'
            if (!grouped[category]) grouped[category] = []
            grouped[category].push(product)
        })
        for (const category in grouped) {
            grouped[category].sort((a, b) => a.name.localeCompare(b.name))
        }
        return grouped
    }

    /**
     * 搜索商品
     */
    async searchProducts(keyword) {
        if (!keyword || !keyword.trim()) return []
        const products = await this.getAllProducts()
        const searchTerm = keyword.toLowerCase().trim()
        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.category.toLowerCase().includes(searchTerm) ||
            (p.description && p.description.toLowerCase().includes(searchTerm))
        ).slice(0, 10)
    }

    /**
     * 获取商品销售排行榜
     */
    async getProductSalesRanking(limit = 10) {
        const products = await this.getAllProducts()
        const incomeRecords = await businessDataService.getAllIncomeRecords()

        const salesData = {}
        products.forEach(product => {
            salesData[product.id] = {
                id: product.id,
                name: product.name,
                category: product.category,
                unit: product.unit,
                quantity: 0,
                amount: 0,
                count: 0
            }
        })

        incomeRecords.forEach(record => {
            if (record.productId && salesData[record.productId]) {
                salesData[record.productId].quantity += record.quantity || 0
                salesData[record.productId].amount += record.amount || 0
                salesData[record.productId].count++
            }
        })

        return Object.values(salesData)
            .filter(p => p.quantity > 0 || p.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit)
    }

    /**
     * 获取商品统计信息
     */
    async getProductStats(productId) {
        const [inventory, incomeRecords, expenseRecords] = await Promise.all([
            businessDataService.getAllInventory(),
            businessDataService.getAllIncomeRecords(),
            businessDataService.getAllExpenseRecords()
        ])

        const inventoryItem = inventory.find(i => i.productId === productId)
        const currentStock = inventoryItem?.quantity || 0
        const currentStockValue = currentStock * (inventoryItem?.costPrice || 0)

        const salesRecords = incomeRecords.filter(r => r.productId === productId)
        const totalSalesQuantity = salesRecords.reduce((sum, r) => sum + (r.quantity || 0), 0)
        const totalSalesAmount = salesRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
        const averageSellingPrice = totalSalesQuantity > 0 ? totalSalesAmount / totalSalesQuantity : 0

        const purchaseRecords = expenseRecords.filter(r => r.productId === productId)
        const totalPurchaseQuantity = purchaseRecords.reduce((sum, r) => sum + (r.quantity || 0), 0)
        const totalPurchaseAmount = purchaseRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
        const averagePurchasePrice = totalPurchaseQuantity > 0 ? totalPurchaseAmount / totalPurchaseQuantity : 0

        const estimatedProfit = totalSalesAmount - (totalSalesQuantity * averagePurchasePrice)
        const profitMargin = totalSalesAmount > 0 ? estimatedProfit / totalSalesAmount : 0

        return {
            currentStock, currentStockValue,
            totalSalesQuantity, totalSalesAmount, averageSellingPrice,
            totalPurchaseQuantity, totalPurchaseAmount, averagePurchasePrice,
            estimatedProfit, profitMargin,
            salesCount: salesRecords.length, purchaseCount: purchaseRecords.length
        }
    }

    /**
     * 批量导入商品
     */
    async importProducts(productsData) {
        const results = { success: [], failed: [], total: productsData.length }

        for (const product of productsData) {
            try {
                const existingProducts = await this.getAllProducts()
                const exists = existingProducts.some(p => p.name === product.name)

                if (exists) {
                    results.failed.push({ ...product, reason: '商品名称已存在' })
                } else {
                    await this.addProduct(product)
                    results.success.push(product)
                }
            } catch (error) {
                results.failed.push({ ...product, reason: error.message })
            }
        }

        return results
    }

    /**
     * 导出商品数据为CSV
     */
    exportProductsToCSV(products) {
        const data = products.map(p => ({
            商品名称: p.name,
            分类: p.category,
            单位: p.unit,
            参考售价: p.defaultPrice ? `¥${p.defaultPrice.toFixed(2)}` : '-',
            描述: p.description || '-',
            创建时间: p.createTime ? baseService.formatDateTime(p.createTime) : '-',
            更新时间: p.updateTime ? baseService.formatDateTime(p.updateTime) : '-'
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

    // ==================== 快速添加商品相关方法 ====================

    /**
     * 获取快速添加商品表单的默认值
     */
    getQuickProductFormDefault() {
        return {
            name: '',
            category: '',
            unit: '',
            defaultPrice: '',
            description: ''
        }
    }

    /**
     * 获取快速添加商品表单配置
     */
    getQuickProductFormConfig() {
        return {
            name: {
                label: '商品名称',
                icon: 'fas fa-tag',
                required: true,
                placeholder: '例如：大白菜、西红柿',
                autofocus: true
            },
            category: {
                label: '商品分类',
                icon: 'fas fa-folder',
                required: true,
                placeholder: '选择分类'
            },
            unit: {
                label: '单位',
                icon: 'fas fa-balance-scale',
                required: true,
                placeholder: '选择单位'
            },
            defaultPrice: {
                label: '参考售价 (元)',
                icon: 'fas fa-yen-sign',
                required: false,
                placeholder: '例如：5.00',
                hint: '可选，可在商品管理中修改'
            },
            description: {
                label: '描述/备注',
                icon: 'fas fa-align-left',
                required: false,
                placeholder: '例如：产地、规格等'
            }
        }
    }

    /**
     * 获取单位选项（用于快速添加）
     */
    getUnitOptions() {
        return this.getProductUnits().map(unit => ({
            value: unit,
            label: unit
        }))
    }

    /**
     * 获取商品分类选项（用于快速添加）
     */
    async getProductCategoryOptions() {
        const categories = await businessDataService.getAllCategories()
        if (!categories || categories.length === 0) {
            return this.getDefaultCategories()
        }
        return categories.map(c => ({
            id: c.id,
            name: c.name,
            isDefault: c.isDefault || false,
            sortOrder: c.sortOrder || 999
        })).sort((a, b) => a.sortOrder - b.sortOrder)
    }

    /**
     * 获取默认分类列表
     */
    getDefaultCategories() {
        return [
            { id: 'default-1', name: '蔬菜', isDefault: true, sortOrder: 1 },
            { id: 'default-2', name: '水果', isDefault: true, sortOrder: 2 },
            { id: 'default-3', name: '粮油', isDefault: true, sortOrder: 3 },
            { id: 'default-4', name: '调味品', isDefault: true, sortOrder: 4 },
            { id: 'default-5', name: '日用品', isDefault: true, sortOrder: 5 },
            { id: 'default-6', name: '其他', isDefault: true, sortOrder: 99 }
        ]
    }

    /**
     * 获取快速添加按钮提示文本
     */
    async getQuickAddButtonHint() {
        const categories = await businessDataService.getAllCategories()
        if (!categories || categories.length === 0) {
            return '请先添加商品分类'
        }
        return '快速添加新商品'
    }

    /**
     * 验证快速添加商品表单
     */
    validateQuickProductForm(formData) {
        const errors = []

        if (!formData.name || !formData.name.trim()) errors.push('商品名称不能为空')
        if (!formData.category) errors.push('请选择商品分类')
        if (!formData.unit) errors.push('请选择商品单位')

        if (formData.defaultPrice) {
            const price = parseFloat(formData.defaultPrice)
            if (isNaN(price) || price < 0) errors.push('参考售价必须为有效的正数')
        }

        return { valid: errors.length === 0, errors }
    }

    /**
     * 创建快速添加的商品数据对象
     */
    createQuickProduct(formData) {
        return {
            name: formData.name.trim(),
            category: formData.category,
            unit: formData.unit,
            defaultPrice: formData.defaultPrice ? parseFloat(formData.defaultPrice) : null,
            description: formData.description ? formData.description.trim() : '',
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
        }
    }

    /**
     * 检查商品名称是否已存在
     */
    async isProductNameDuplicate(newProductName) {
        const existingProducts = await this.getAllProducts()
        const trimmedName = newProductName.trim().toLowerCase()
        return existingProducts.some(p => p.name.toLowerCase() === trimmedName)
    }

    /**
     * 获取快速添加成功消息
     */
    getQuickProductSuccessMessage(productName) {
        return `商品 "${productName}" 添加成功！`
    }

    /**
     * 获取快速添加失败消息
     */
    getQuickProductErrorMessage(errorMessage) {
        return errorMessage || '添加商品失败，请重试'
    }
}

export default new ProductService()