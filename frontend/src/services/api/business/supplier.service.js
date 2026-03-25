// services/business/supplier.service.js
import businessDataService from '@/services/cache/business-cache.service.js'

/**
 * 供应商管理业务服务
 */
class SupplierService {
    /**
     * 获取所有供应商列表
     */
    async getAllSuppliers() {
        return businessDataService.getAllSuppliers()
    }

    /**
     * 添加供应商
     */
    async addSupplier(supplierData) {
        if (!supplierData.name) throw new Error('供应商名称不能为空')
        return businessDataService.addSupplier(supplierData)
    }

    /**
     * 更新供应商
     */
    async updateSupplier(supplierId, supplierData) {
        if (!supplierId) throw new Error('供应商ID不能为空')
        return businessDataService.updateSupplier(supplierId, supplierData)
    }

    /**
     * 删除供应商
     */
    async deleteSupplier(supplierId) {
        if (!supplierId) throw new Error('供应商ID不能为空')

        const purchaseOrders = await businessDataService.getAllPurchaseOrders()
        const hasRelatedOrders = purchaseOrders.some(order => order.supplierId === supplierId)
        if (hasRelatedOrders) throw new Error('该供应商有关联的采购订单，无法删除')

        return businessDataService.deleteSupplier(supplierId)
    }

    /**
     * 筛选供应商
     */
    filterSuppliers(suppliers, keyword = '') {
        let filtered = [...suppliers]

        if (keyword && keyword.trim()) {
            const searchTerm = keyword.toLowerCase().trim()
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(searchTerm) ||
                (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm)) ||
                (s.phone && s.phone.includes(searchTerm))
            )
        }

        return filtered
    }

    /**
     * 获取供应商类别选项
     */
    getSupplierCategories() {
        return ['蔬菜供应商', '水果供应商', '粮油供应商', '调味品供应商', '包装物料供应商', '其他']
    }

    /**
     * 获取结算方式选项
     */
    getPaymentTerms() {
        return ['现结', '周结', '月结', '季结', '年结']
    }

    /**
     * 验证供应商表单
     */
    validateSupplierForm(supplierForm) {
        const errors = []

        if (!supplierForm.name || !supplierForm.name.trim()) errors.push('供应商名称不能为空')

        if (supplierForm.phone && !/^[\d\s\-+()]+$/.test(supplierForm.phone)) {
            errors.push('联系电话格式不正确')
        }

        if (supplierForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierForm.email)) {
            errors.push('邮箱格式不正确')
        }

        return { valid: errors.length === 0, errors }
    }

    /**
     * 导出供应商为CSV
     */
    exportSuppliersToCSV(suppliers) {
        const baseService = require('./base.service.js').default

        const data = suppliers.map(s => ({
            供应商名称: s.name,
            联系人: s.contactPerson || '-',
            电话: s.phone || '-',
            邮箱: s.email || '-',
            类别: s.category || '-',
            结算方式: s.paymentTerms || '-',
            地址: s.address || '-',
            采购次数: s.purchaseCount || 0,
            采购总额: `¥${baseService.formatNumber(s.totalAmount || 0)}`,
            备注: s.note || '-'
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

export default new SupplierService()