// data_migration/import.js
import businessDataService from '@/services/cache/business-cache.service.js'
import { personalSavingCache, groupSavingCache, savingService } from '@/services'
import notificationService from '@/services/utils/notification.service.js'
import indexedDBService from '@/services/db/indexed-db.service.js'
import * as XLSX from 'xlsx'
import idGenerator from '@/services/id-generator.service.js'

/**
 * 微信支付账单解析器
 */
class WechatBillParser {
    constructor(userId) {
        this.userId = userId
    }

    /**
     * 解析微信账单Excel数据
     * @param {Array} excelData - 从Excel解析出的原始数据
     * @returns {Array} 转换后的daily_records数据
     */
    parseWechatBill(excelData) {
        const records = []

        for (let i = 0; i < excelData.length; i++) {
            const row = excelData[i]
            if (!row || row.length < 8) continue

            const transactionTime = row[0]
            const transactionType = row[1]
            const counterparty = row[2]
            const goods = row[3]
            const incomeExpense = row[4]
            const amountStr = row[5]
            const paymentMethod = row[6]
            const status = row[7]
            const transactionNo = row[8]
            const merchantNo = row[9]
            const remark = row[10]

            if (!transactionTime || !incomeExpense) continue

            let amount = 0
            if (amountStr) {
                const cleanAmount = String(amountStr).replace(/[¥,]/g, '').trim()
                amount = parseFloat(cleanAmount)
                if (isNaN(amount)) continue
            }

            let dateStr = ''
            if (transactionTime) {
                const dateMatch = transactionTime.match(/^(\d{4}-\d{2}-\d{2})/)
                if (dateMatch) {
                    dateStr = dateMatch[1]
                }
            }

            const category = this.inferCategory(transactionType, counterparty, goods)
            const type = incomeExpense === '收入' ? '收入' : '支出'
            const timestamp = new Date().toISOString()

            const recordId = idGenerator.generateDailyRecordId(this.userId)

            // 构建daily_records对象
            const record = {
                id: recordId,  // 使用生成的ID
                date: dateStr,
                type: type,
                category: category,
                amount: amount,
                note: this.buildNote(transactionType, counterparty, goods, remark),
                businessType: 'personal',
                paymentMethod: this.mapPaymentMethod(paymentMethod, incomeExpense),
                userId: this.userId,
                source: this.extractSource(counterparty, goods),
                syncStatus: 'pending',
                createTime: timestamp,
                updateTime: timestamp,
                timestamp: timestamp
            }

            records.push(record)
        }

        return records
    }

    /**
     * 推断分类
     */
    inferCategory(transactionType, counterparty, goods) {
        const counterpartyLower = (counterparty || '').toLowerCase()
        const goodsLower = (goods || '').toLowerCase()

        if (counterpartyLower.includes('餐饮') || counterpartyLower.includes('餐厅') ||
            counterpartyLower.includes('美食') || goodsLower.includes('餐饮')) {
            return '餐饮'
        }

        if (counterpartyLower.includes('超市') || counterpartyLower.includes('便利店') ||
            counterpartyLower.includes('购物') || counterpartyLower.includes('佳源生活超市')) {
            return '购物'
        }

        if (counterpartyLower.includes('腾讯天游') || counterpartyLower.includes('哔哩哔哩') ||
            counterpartyLower.includes('宽娱数码') || counterpartyLower.includes('王者荣耀') ||
            goodsLower.includes('游戏') || goodsLower.includes('漫币') || goodsLower.includes('王者荣耀')) {
            return '游戏娱乐'
        }

        if (counterpartyLower.includes('中铁网络') || counterpartyLower.includes('铁路') ||
            goodsLower.includes('12306')) {
            return '交通出行'
        }

        if (counterpartyLower.includes('广电') || counterpartyLower.includes('腾讯云') ||
            counterpartyLower.includes('网络')) {
            return '通讯网络'
        }

        if (counterpartyLower.includes('网飞物联') || counterpartyLower.includes('快递')) {
            return '物流快递'
        }

        if (transactionType === '转账') {
            return '转账'
        }

        return '其他'
    }

    buildNote(transactionType, counterparty, goods, remark) {
        const parts = []
        if (transactionType && transactionType !== '商户消费') {
            parts.push(`类型:${transactionType}`)
        }
        if (counterparty && counterparty !== '/' && counterparty !== '') {
            parts.push(`对方:${counterparty}`)
        }
        if (goods && goods !== '/' && goods !== '') {
            parts.push(`商品:${goods}`)
        }
        if (remark && remark !== '/' && remark !== '') {
            parts.push(`备注:${remark}`)
        }
        return parts.join(' | ') || '微信支付账单'
    }

    mapPaymentMethod(paymentMethod, incomeExpense) {
        if (incomeExpense === '收入') return '微信转账'
        if (!paymentMethod || paymentMethod === '/') return '微信支付'
        if (paymentMethod.includes('零钱')) return '微信零钱'
        if (paymentMethod.includes('银行卡')) return '银行卡'
        return paymentMethod
    }

    extractSource(counterparty, goods) {
        if (counterparty && counterparty !== '/' && counterparty !== '') return counterparty
        if (goods && goods !== '/' && goods !== '') return goods
        return '微信支付'
    }
}

export function Import() {
    // 解析导入的文件（JSON格式）
    const parseImportFile = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result)
                    resolve(data)
                } catch (error) {
                    reject(new Error('文件解析失败，请确保是有效的 JSON 格式'))
                }
            }
            reader.onerror = () => reject(new Error('文件读取失败'))
            reader.readAsText(file)
        })
    }

    /**
     * 解析Excel文件并导入微信账单
     */
    const importWechatBill = async (userId, file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result)
                    const workbook = XLSX.read(data, { type: 'array' })
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                    const excelData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' })

                    let startRow = -1
                    for (let i = 0; i < excelData.length; i++) {
                        const row = excelData[i]
                        if (row && row[0] && String(row[0]).includes('交易时间')) {
                            startRow = i + 1
                            break
                        }
                    }

                    if (startRow === -1) {
                        reject(new Error('未找到微信账单数据，请确认文件格式'))
                        return
                    }

                    const billData = excelData.slice(startRow).filter(row => {
                        return row && row[0] && String(row[0]).trim() !== ''
                    })

                    if (billData.length === 0) {
                        reject(new Error('没有找到有效的账单数据'))
                        return
                    }

                    const parser = new WechatBillParser(userId)
                    const records = parser.parseWechatBill(billData)

                    resolve(records)
                } catch (error) {
                    console.error('解析Excel失败:', error)
                    reject(new Error('文件解析失败：' + error.message))
                }
            }
            reader.onerror = () => reject(new Error('文件读取失败'))
            reader.readAsArrayBuffer(file)
        })
    }

    /**
     * 获取指定日期范围内的现有记录
     */
    const getExistingRecordsInDateRange = async (userId, dateRange) => {
        const allRecords = await indexedDBService.getAll('daily_records')
        return allRecords.filter(record => {
            if (record.businessType !== 'personal') return false
            if (record.userId !== userId) return false

            const recordDate = record.date
            if (dateRange.startDate && recordDate < dateRange.startDate) return false
            if (dateRange.endDate && recordDate > dateRange.endDate) return false

            return true
        })
    }

    /**
     * 删除指定日期范围内的现有记录
     */
    const deleteRecordsInDateRange = async (userId, dateRange) => {
        const recordsToDelete = await getExistingRecordsInDateRange(userId, dateRange)
        let deletedCount = 0

        for (const record of recordsToDelete) {
            try {
                await indexedDBService.delete('daily_records', record.id)
                deletedCount++
            } catch (error) {
                console.error('删除记录失败:', error, record)
            }
        }

        return deletedCount
    }

    /**
     * 获取导入数据的日期范围
     */
    const getImportDateRange = (records) => {
        if (!records || records.length === 0) return null

        let minDate = records[0].date
        let maxDate = records[0].date

        for (const record of records) {
            if (record.date < minDate) minDate = record.date
            if (record.date > maxDate) maxDate = record.date
        }

        return { startDate: minDate, endDate: maxDate }
    }

    /**
     * 导入微信账单数据（支持选择性覆盖）
     */
    const importWechatBillData = async (userId, file, options = {}) => {
        const {
            clearBeforeImport = false,
            overwriteMode = 'append', // 'append', 'overwrite_all', 'overwrite_range'
            overwriteDateRange = null // { startDate, endDate }
        } = options

        try {
            // 解析并转换数据
            const records = await importWechatBill(userId, file)

            if (records.length === 0) {
                return { successCount: 0, failCount: 0, total: 0, message: '没有可导入的数据' }
            }

            const importDateRange = getImportDateRange(records)

            // 根据覆盖模式处理
            if (overwriteMode === 'overwrite_all') {
                // 删除所有个人记账数据
                const allRecords = await indexedDBService.getAll('daily_records')
                for (const record of allRecords) {
                    if (record.businessType === 'personal' && record.userId === userId) {
                        await indexedDBService.delete('daily_records', record.id)
                    }
                }
            } else if (overwriteMode === 'overwrite_range' && overwriteDateRange) {
                // 删除指定日期范围内的数据
                await deleteRecordsInDateRange(userId, overwriteDateRange)
            } else if (clearBeforeImport) {
                // 兼容旧逻辑：清空所有个人记账数据
                const allRecords = await indexedDBService.getAll('daily_records')
                for (const record of allRecords) {
                    if (record.businessType === 'personal' && record.userId === userId) {
                        await indexedDBService.delete('daily_records', record.id)
                    }
                }
            }

            // 批量导入新数据
            let successCount = 0
            let failCount = 0

            for (const record of records) {
                try {
                    // 清理可能残留的 wechatInfo
                    const { wechatInfo, ...cleanRecord } = record

                    await indexedDBService.add('daily_records', cleanRecord)
                    successCount++
                } catch (error) {
                    console.error('导入失败:', error, record)
                    failCount++
                }
            }

            return {
                successCount,
                failCount,
                total: records.length,
                importDateRange,
                message: `成功导入 ${successCount} 条记录`
            }
        } catch (error) {
            console.error('导入微信账单失败:', error)
            throw error
        }
    }

    /**
     * 检查并获取指定日期的现有记录（用于覆盖确认）
     */
    const checkExistingRecordsByDate = async (userId, records) => {
        const dateMap = new Map()

        for (const record of records) {
            const existingRecords = await getExistingRecordsInDateRange(userId, {
                startDate: record.date,
                endDate: record.date
            })

            if (existingRecords.length > 0) {
                if (!dateMap.has(record.date)) {
                    dateMap.set(record.date, existingRecords.length)
                }
            }
        }

        return Array.from(dateMap.entries()).map(([date, count]) => ({
            date,
            count
        }))
    }

    /**
     * 智能导入：合并数据，不覆盖
     */
    const importWechatBillSmart = async (userId, file, options = {}) => {
        const { onDuplicate } = options // onDuplicate 回调函数，用于处理重复记录

        try {
            const records = await importWechatBill(userId, file)
            let successCount = 0
            let failCount = 0
            let duplicateCount = 0

            for (const record of records) {
                try {
                    // 检查是否已存在相同日期的记录
                    const existingRecords = await getExistingRecordsInDateRange(userId, {
                        startDate: record.date,
                        endDate: record.date
                    })

                    if (existingRecords.length > 0 && onDuplicate) {
                        // 调用回调函数，让用户决定如何处理
                        const shouldOverwrite = await onDuplicate(record, existingRecords)

                        if (shouldOverwrite) {
                            // 删除旧记录
                            for (const oldRecord of existingRecords) {
                                await indexedDBService.delete('daily_records', oldRecord.id)
                            }
                            // 添加新记录
                            await indexedDBService.add('daily_records', record)
                            successCount++
                        } else {
                            duplicateCount++
                        }
                    } else {
                        // 没有重复，直接添加
                        await indexedDBService.add('daily_records', record)
                        successCount++
                    }
                } catch (error) {
                    console.error('导入失败:', error, record)
                    failCount++
                }
            }

            return {
                successCount,
                failCount,
                duplicateCount,
                total: records.length,
                message: `成功导入 ${successCount} 条，跳过重复 ${duplicateCount} 条，失败 ${failCount} 条`
            }
        } catch (error) {
            console.error('导入微信账单失败:', error)
            throw error
        }
    }

    // 导入收支数据（JSON格式）
    const importIncomeExpenseData = async (data, options = { overwriteMode: 'append' }) => {
        const records = data.incomeExpense || []
        let successCount = 0
        let failCount = 0

        for (const record of records) {
            try {
                // 根据业务类型选择对应的表
                if (record.businessType === '生意记账' || record.业务类型 === '生意记账') {
                    if (record.type === '收入' || record.类型 === '收入') {
                        await businessDataService.addIncomeRecord({
                            date: record.date || record.日期,
                            category: record.category || record.分类,
                            amount: parseFloat(record.amount || record.金额),
                            paymentMethod: record.paymentMethod || record.支付方式,
                            note: record.note || record.备注,
                            businessType: 'business'
                        })
                    } else {
                        await businessDataService.addExpenseRecord({
                            date: record.date || record.日期,
                            category: record.category || record.分类,
                            amount: parseFloat(record.amount || record.金额),
                            paymentMethod: record.paymentMethod || record.支付方式,
                            supplier: record.supplier || record.供应商,
                            note: record.note || record.备注,
                            businessType: 'business'
                        })
                    }
                } else {
                    await businessDataService.addDailyRecord({
                        date: record.date || record.日期,
                        type: record.type || record.类型,
                        category: record.category || record.分类,
                        amount: parseFloat(record.amount || record.金额),
                        note: record.note || record.备注,
                        businessType: 'personal'
                    })
                }
                successCount++
            } catch (error) {
                console.error('导入收支记录失败:', error)
                failCount++
            }
        }

        return { successCount, failCount }
    }

    // 导入个人存钱数据
    const importPersonalSavingData = async (userId, data, options = { overwriteMode: 'append' }) => {
        const plans = data.personalSaving || []
        let successCount = 0
        let failCount = 0

        try {
            await personalSavingCache.init(userId)

            for (const planData of plans) {
                try {
                    // 创建计划
                    const createResult = await personalSavingCache.createPlan(userId, {
                        name: planData.计划名称,
                        type: planData.计划类型 || '日常储蓄',
                        targetAmount: parseFloat(planData.目标金额),
                        currentAmount: parseFloat(planData.当前金额 || 0),
                        deadline: planData.截止日期,
                        reason: planData.理由 || ''
                    })

                    if (createResult.success) {
                        successCount++
                    } else {
                        failCount++
                    }
                } catch (error) {
                    console.error('导入个人存钱计划失败:', error)
                    failCount++
                }
            }
        } catch (error) {
            console.error('导入个人存钱数据失败:', error)
        }

        return { successCount, failCount }
    }

    // 导入多人存钱数据
    const importGroupSavingData = async (userId, data, options = { overwriteMode: 'append' }) => {
        const plans = data.groupSaving || []
        let successCount = 0
        let failCount = 0

        try {
            await groupSavingCache.init(userId)

            for (const planData of plans) {
                try {
                    const createResult = await savingService.createGroupSavings({
                        name: planData.计划名称,
                        type: planData.计划类型 || '日常储蓄',
                        targetAmount: parseFloat(planData.目标金额),
                        deadline: planData.截止日期,
                        reason: planData.理由 || '',
                        members: planData.成员 || []
                    })

                    if (createResult.success) {
                        successCount++
                    } else {
                        failCount++
                    }
                } catch (error) {
                    console.error('导入多人存钱计划失败:', error)
                    failCount++
                }
            }
        } catch (error) {
            console.error('导入多人存钱数据失败:', error)
        }

        return { successCount, failCount }
    }

    // 导入商品数据
    const importProductsData = async (data, options = { overwriteMode: 'append' }) => {
        const products = data.products || []
        let successCount = 0
        let failCount = 0

        for (const product of products) {
            try {
                await businessDataService.addProduct({
                    name: product.商品名称,
                    category: product.分类,
                    unit: product.单位,
                    defaultPrice: parseFloat(product.默认售价) || 0,
                    defaultPurchasePrice: parseFloat(product.默认进价) || 0,
                    note: product.备注
                })
                successCount++
            } catch (error) {
                console.error('导入商品失败:', error)
                failCount++
            }
        }

        return { successCount, failCount }
    }

    // 导入库存数据
    const importInventoryData = async (data, options = { overwriteMode: 'append' }) => {
        const inventory = data.inventory || []
        let successCount = 0
        let failCount = 0

        for (const item of inventory) {
            try {
                await businessDataService.addInventoryItem({
                    productName: item.商品名称,
                    category: item.分类,
                    quantity: parseFloat(item.库存数量) || 0,
                    unit: item.单位,
                    purchasePrice: parseFloat(item.进货价) || 0,
                    sellingPrice: parseFloat(item.售价) || 0,
                    expiryDate: item.过期日期,
                    status: item.状态,
                    note: item.备注
                })
                successCount++
            } catch (error) {
                console.error('导入库存失败:', error)
                failCount++
            }
        }

        return { successCount, failCount }
    }

    // 导入商品分类
    const importCategoriesData = async (data, options = { overwriteMode: 'append' }) => {
        const categories = data.categories || []
        let successCount = 0
        let failCount = 0

        for (const category of categories) {
            try {
                await businessDataService.addCategory({
                    name: category.分类名称,
                    icon: category.图标,
                    sortOrder: category.排序,
                    isDefault: category.是否默认 === '是'
                })
                successCount++
            } catch (error) {
                console.error('导入分类失败:', error)
                failCount++
            }
        }

        return { successCount, failCount }
    }

    // 导入供应商
    const importSuppliersData = async (data, options = { overwriteMode: 'append' }) => {
        const suppliers = data.suppliers || []
        let successCount = 0
        let failCount = 0

        for (const supplier of suppliers) {
            try {
                await businessDataService.addSupplier({
                    name: supplier.供应商名称,
                    contact: supplier.联系人,
                    phone: supplier.电话,
                    address: supplier.地址,
                    note: supplier.备注
                })
                successCount++
            } catch (error) {
                console.error('导入供应商失败:', error)
                failCount++
            }
        }

        return { successCount, failCount }
    }

    // 导入客户
    const importCustomersData = async (data, options = { overwriteMode: 'append' }) => {
        const customers = data.customers || []
        let successCount = 0
        let failCount = 0

        try {
            const existingCustomers = JSON.parse(localStorage.getItem('customers') || '[]')

            for (const customer of customers) {
                try {
                    existingCustomers.push({
                        id: Date.now() + Math.random(),
                        name: customer.客户名称,
                        type: customer.客户类型 === '企业' ? 'company' : 'personal',
                        contact: customer.联系人,
                        phone: customer.电话,
                        address: customer.地址,
                        creditLimit: parseFloat(customer.信用额度) || 0,
                        currentDebt: parseFloat(customer.当前欠款) || 0,
                        note: customer.备注,
                        createTime: new Date().toISOString()
                    })
                    successCount++
                } catch (error) {
                    console.error('导入客户失败:', error)
                    failCount++
                }
            }

            localStorage.setItem('customers', JSON.stringify(existingCustomers))
        } catch (error) {
            console.error('导入客户数据失败:', error)
        }

        return { successCount, failCount }
    }

    // 清空当前用户数据
    const clearUserData = async (userId) => {
        try {
            await businessDataService.clearUserData()
            await personalSavingCache.init(userId)
            await personalSavingCache.clearUserPlans(userId)
            await groupSavingCache.init(userId)
            await groupSavingCache.clearUserCache(userId)

            const allRecords = await indexedDBService.getAll('daily_records')
            for (const record of allRecords) {
                if (record.businessType === 'personal') {
                    await indexedDBService.delete('daily_records', record.id)
                }
            }

            return true
        } catch (error) {
            console.error('清空用户数据失败:', error)
            return false
        }
    }

    return {
        parseImportFile,
        importIncomeExpenseData,
        importPersonalSavingData,
        importGroupSavingData,
        importProductsData,
        importInventoryData,
        importCategoriesData,
        importSuppliersData,
        importCustomersData,
        clearUserData,
        importWechatBillData,
        importWechatBill,
        importWechatBillSmart,
        checkExistingRecordsByDate,
        getExistingRecordsInDateRange,
        deleteRecordsInDateRange,
        getImportDateRange
    }
}