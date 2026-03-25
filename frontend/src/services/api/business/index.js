// services/business/index.js
import baseService from './base.service.js'
import dailyService from './daily.service.js'
import incomeService from './income.service.js'
import expenseService from './expense.service.js'
import productService from './product.service.js'
import categoryService from './category.service.js'
import inventoryService from './inventory.service.js'
import customerService from './customer.service.js'
import supplierService from './supplier.service.js'
import purchaseService from './purchase.service.js'
import creditService from './credit.service.js'
import costService from './cost.service.js'
import reportService from './report.service.js'

/**
 * 业务服务聚合导出
 * 所有业务模块都通过此文件导出
 */
class BusinessApiService {
    constructor() {
        // 基础服务
        this.base = baseService
        // 记账服务
        this.daily = dailyService
        this.income = incomeService
        this.expense = expenseService
        // 基础数据服务
        this.product = productService
        this.category = categoryService
        this.customer = customerService
        this.inventory = inventoryService
        // 采购供应商服务
        this.supplier = supplierService
        this.purchase = purchaseService
        // 信用服务
        this.credit = creditService
        // 分析服务
        this.cost = costService
        this.report = reportService
    }

    /**
     * 初始化所有服务
     */
    async init(userId) {
        await baseService.init(userId)
        console.log('业务服务初始化完成')
    }
}

export default new BusinessApiService()