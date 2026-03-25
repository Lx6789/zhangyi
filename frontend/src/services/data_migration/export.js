// data_migration/export.js
import * as XLSX from 'xlsx'
import businessDataService from '@/services/cache/business-cache.service.js'
import { personalSavingCache, groupSavingCache, savingService } from '@/services'
import authHelperService from '@/services/utils/auth-helper.service.js'

export function Export() {
    // 格式化日期
    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    // 格式化金额
    const formatMoney = (num) => {
        if (num === undefined || num === null) return '0.00'
        return parseFloat(num).toFixed(2)
    }

    // 格式化时间（包含时分秒）
    const formatDateTime = (dateStr) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
    }

    // 获取用户手机号
    const getUserPhone = () => {
        try {
            const user = authHelperService.getCurrentUser()
            return user?.phone || user?.username || user?.id || '用户'
        } catch (error) {
            return '用户'
        }
    }

    // 获取当前时间字符串（用于文件名）
    const getCurrentTimeStr = () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hour = String(now.getHours()).padStart(2, '0')
        const minute = String(now.getMinutes()).padStart(2, '0')
        const second = String(now.getSeconds()).padStart(2, '0')
        return `${year}${month}${day}_${hour}${minute}${second}`
    }

    // 生成文件名：手机号_表名_导出时间.xlsx
    const generateFileName = (sheetName) => {
        const userPhone = getUserPhone()
        const timeStr = getCurrentTimeStr()
        return `${userPhone}_${sheetName}_${timeStr}.xlsx`
    }

    // ==================== 个人记账数据（单独导出） ====================
    const getPersonalAccountingData = async (userId, dateRange) => {
        const data = []
        const records = await businessDataService.getAllBusinessRecords()

        // 按日期筛选
        let filteredRecords = [...records]
        if (dateRange.start) {
            filteredRecords = filteredRecords.filter(r => r.date >= dateRange.start)
        }
        if (dateRange.end) {
            filteredRecords = filteredRecords.filter(r => r.date <= dateRange.end)
        }

        // 筛选个人记账（businessType !== 'business' 或 undefined）
        const personalRecords = filteredRecords.filter(r => r.businessType !== 'business')

        for (const record of personalRecords) {
            data.push({
                '日期': record.date,
                '类型': record.type,
                '分类': record.category,
                '子分类/项目': record.subtype || record.source || '',
                '金额': formatMoney(record.amount),
                '支付/收款方式': record.paymentMethod || '',
                '备注': record.note || ''
            })
        }

        data.sort((a, b) => a['日期'].localeCompare(b['日期']))
        return data
    }

    // ==================== 生意记账数据（单独导出） ====================
    const getBusinessAccountingData = async (userId, dateRange) => {
        const data = []
        const records = await businessDataService.getAllBusinessRecords()

        // 按日期筛选
        let filteredRecords = [...records]
        if (dateRange.start) {
            filteredRecords = filteredRecords.filter(r => r.date >= dateRange.start)
        }
        if (dateRange.end) {
            filteredRecords = filteredRecords.filter(r => r.date <= dateRange.end)
        }

        // 筛选生意记账（businessType === 'business'）
        const businessRecords = filteredRecords.filter(r => r.businessType === 'business')

        for (const record of businessRecords) {
            data.push({
                '日期': record.date,
                '类型': record.type,
                '分类': record.category,
                '子分类/项目': record.subtype || record.source || '',
                '金额': formatMoney(record.amount),
                '支付/收款方式': record.paymentMethod || '',
                '供应商/客户': record.supplier || record.customerName || '',
                '备注': record.note || ''
            })
        }

        data.sort((a, b) => a['日期'].localeCompare(b['日期']))
        return data
    }

    // ==================== 个人存钱数据（单独导出） ====================
    const getPersonalSavingData = async (userId) => {
        const data = []
        try {
            await personalSavingCache.init(userId)
            const plans = await personalSavingCache.getAllPlans(userId)
            const activePlans = plans.filter(p => p.deleted !== 1)

            for (const plan of activePlans) {
                const records = await personalSavingCache.getDepositRecords(
                    userId,
                    plan.id,
                    { page: 1, size: 9999 }
                )

                for (const record of records.records || []) {
                    data.push({
                        '计划名称': plan.name,
                        '计划类型': plan.type || '日常储蓄',
                        '目标金额': formatMoney(plan.targetAmount),
                        '已存金额': formatMoney(plan.currentAmount),
                        '存入金额': formatMoney(record.amount),
                        '存入时间': formatDateTime(record.depositTime),
                        '存后余额': formatMoney(record.afterAmount),
                        '进度': plan.currentAmount >= plan.targetAmount ? '已完成' : `${Math.round((plan.currentAmount / plan.targetAmount) * 100)}%`,
                        '截止日期': plan.deadline || '',
                        '备注': record.note || ''
                    })
                }
            }
        } catch (error) {
            console.error('获取个人存钱数据失败:', error)
        }

        data.sort((a, b) => a['存入时间'].localeCompare(b['存入时间']))
        return data
    }

    // ==================== 多人存钱数据（单独导出） ====================
    const getGroupSavingData = async (userId) => {
        const data = []
        try {
            await groupSavingCache.init(userId)

            const response = await savingService.getGroupSavingsList({}, false)
            let plans = []

            if (response && response.code === 200) {
                plans = response.data || []
            } else if (Array.isArray(response)) {
                plans = response
            }

            console.log('【导出】获取到多人存钱计划数:', plans.length)

            if (plans.length === 0) {
                return data
            }

            for (const plan of plans) {
                try {
                    const result = await groupSavingCache.getDepositRecords(
                        userId,
                        plan.id,
                        { page: 1, size: 9999 }
                    )

                    const records = result?.records || []

                    for (const record of records) {
                        let memberName = record.memberName || `用户${record.memberId}`

                        data.push({
                            '计划名称': plan.name,
                            '计划类型': plan.type || '日常储蓄',
                            '目标金额': formatMoney(plan.targetAmount),
                            '当前总额': formatMoney(plan.currentAmount),
                            '存入成员': memberName,
                            '存入金额': formatMoney(record.amount),
                            '存入时间': formatDateTime(record.depositTime),
                            '该成员累计': formatMoney(record.afterAmount || 0),
                            '计划进度': plan.currentAmount >= plan.targetAmount ? '已完成' : `${Math.round((plan.currentAmount / plan.targetAmount) * 100)}%`,
                            '截止日期': plan.deadline || '',
                            '备注': record.note || '',
                            '计划状态': plan.status === 'active' ? '进行中' : (plan.status === 'completed' ? '已完成' : '已结束')
                        })
                    }
                } catch (error) {
                    console.error(`【导出】获取计划 ${plan.id} 的存钱记录失败:`, error)
                }
            }
        } catch (error) {
            console.error('获取多人存钱数据失败:', error)
        }

        data.sort((a, b) => a['存入时间'].localeCompare(b['存入时间']))
        return data
    }

    // ==================== 库存数据 ====================
    const getInventoryData = async () => {
        const data = []
        try {
            const items = await businessDataService.getAllInventory()
            for (const item of items) {
                data.push({
                    '商品名称': item.productName || '',
                    '分类': item.category || '',
                    '库存数量': item.quantity || 0,
                    '单位': item.unit || '',
                    '进货价': formatMoney(item.purchasePrice),
                    '售价': formatMoney(item.sellingPrice),
                    '过期日期': item.expiryDate || '',
                    '状态': item.status || '正常',
                    '备注': item.note || ''
                })
            }
        } catch (error) {
            console.error('获取库存数据失败:', error)
        }
        return data
    }

    // ==================== 商品数据 ====================
    const getProductsData = async () => {
        const data = []
        try {
            const products = await businessDataService.getAllProducts()
            for (const product of products) {
                data.push({
                    '商品名称': product.name || '',
                    '分类': product.category || '',
                    '单位': product.unit || '',
                    '默认进价': formatMoney(product.defaultPurchasePrice),
                    '默认售价': formatMoney(product.defaultPrice),
                    '备注': product.note || ''
                })
            }
        } catch (error) {
            console.error('获取商品数据失败:', error)
        }
        return data
    }

    // ==================== 商品分类数据 ====================
    const getCategoriesData = async () => {
        const data = []
        try {
            const categories = await businessDataService.getAllCategories()
            for (const category of categories) {
                data.push({
                    '分类名称': category.name,
                    '图标': category.icon || '',
                    '排序': category.sortOrder || 0,
                    '是否默认': category.isDefault ? '是' : '否'
                })
            }
        } catch (error) {
            console.error('获取分类数据失败:', error)
        }
        return data
    }

    // ==================== 供应商数据 ====================
    const getSuppliersData = async () => {
        const data = []
        try {
            const suppliers = await businessDataService.getAllSuppliers()
            for (const supplier of suppliers) {
                data.push({
                    '供应商名称': supplier.name,
                    '联系人': supplier.contact || '',
                    '电话': supplier.phone || '',
                    '地址': supplier.address || '',
                    '备注': supplier.note || ''
                })
            }
        } catch (error) {
            console.error('获取供应商数据失败:', error)
        }
        return data
    }

    // ==================== 客户数据 ====================
    const getCustomersData = async () => {
        const data = []
        try {
            const customers = JSON.parse(localStorage.getItem('customers') || '[]')
            for (const customer of customers) {
                data.push({
                    '客户名称': customer.name,
                    '客户类型': customer.type === 'company' ? '企业' : '个人',
                    '联系人': customer.contact || '',
                    '电话': customer.phone || '',
                    '地址': customer.address || '',
                    '信用额度': formatMoney(customer.creditLimit),
                    '当前欠款': formatMoney(customer.currentDebt),
                    '备注': customer.note || ''
                })
            }
        } catch (error) {
            console.error('获取客户数据失败:', error)
        }
        return data
    }

    // ==================== 导出所有数据（分别导出每个表） ====================
    const exportAllData = async (userId, options, dateRange, onProgress) => {
        const exportedFiles = []

        // 1. 导出个人记账数据
        if (options.incomeExpense && options.incomeExpenseType.personal) {
            if (onProgress) onProgress('正在导出个人记账数据...')
            const data = await getPersonalAccountingData(userId, dateRange)
            if (data.length > 0) {
                const fileName = generateFileName('个人记账')
                const worksheet = XLSX.utils.json_to_sheet(data)
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, '个人记账')
                XLSX.writeFile(workbook, fileName)
                exportedFiles.push(fileName)
                console.log(`【导出】已导出个人记账数据，共 ${data.length} 条，文件: ${fileName}`)
            } else {
                console.log('【导出】没有个人记账数据')
            }
        }

        // 2. 导出生意记账数据
        if (options.incomeExpense && options.incomeExpenseType.business) {
            if (onProgress) onProgress('正在导出生意记账数据...')
            const data = await getBusinessAccountingData(userId, dateRange)
            if (data.length > 0) {
                const fileName = generateFileName('生意记账')
                const worksheet = XLSX.utils.json_to_sheet(data)
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, '生意记账')
                XLSX.writeFile(workbook, fileName)
                exportedFiles.push(fileName)
                console.log(`【导出】已导出生意记账数据，共 ${data.length} 条，文件: ${fileName}`)
            } else {
                console.log('【导出】没有生意记账数据')
            }
        }

        // 3. 导出个人存钱数据
        if (options.saving && options.savingType.personal) {
            if (onProgress) onProgress('正在导出个人存钱数据...')
            const data = await getPersonalSavingData(userId)
            if (data.length > 0) {
                const fileName = generateFileName('个人存钱')
                const worksheet = XLSX.utils.json_to_sheet(data)
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, '个人存钱记录')
                XLSX.writeFile(workbook, fileName)
                exportedFiles.push(fileName)
                console.log(`【导出】已导出个人存钱数据，共 ${data.length} 条，文件: ${fileName}`)
            } else {
                console.log('【导出】没有个人存钱数据')
            }
        }

        // 4. 导出多人存钱数据
        if (options.saving && options.savingType.group) {
            if (onProgress) onProgress('正在导出多人存钱数据...')
            const data = await getGroupSavingData(userId)
            if (data.length > 0) {
                const fileName = generateFileName('多人存钱')
                const worksheet = XLSX.utils.json_to_sheet(data)
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, '多人存钱记录')
                XLSX.writeFile(workbook, fileName)
                exportedFiles.push(fileName)
                console.log(`【导出】已导出多人存钱数据，共 ${data.length} 条，文件: ${fileName}`)
            } else {
                console.log('【导出】没有多人存钱数据')
            }
        }

        // 5. 导出库存数据
        if (options.inventory) {
            if (onProgress) onProgress('正在导出库存数据...')
            const data = await getInventoryData()
            if (data.length > 0) {
                const fileName = generateFileName('库存数据')
                const worksheet = XLSX.utils.json_to_sheet(data)
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, '库存数据')
                XLSX.writeFile(workbook, fileName)
                exportedFiles.push(fileName)
                console.log(`【导出】已导出库存数据，共 ${data.length} 条，文件: ${fileName}`)
            } else {
                console.log('【导出】没有库存数据')
            }
        }

        // 6. 导出商品数据
        if (options.products) {
            if (onProgress) onProgress('正在导出商品数据...')
            const data = await getProductsData()
            if (data.length > 0) {
                const fileName = generateFileName('商品数据')
                const worksheet = XLSX.utils.json_to_sheet(data)
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, '商品数据')
                XLSX.writeFile(workbook, fileName)
                exportedFiles.push(fileName)
                console.log(`【导出】已导出商品数据，共 ${data.length} 条，文件: ${fileName}`)
            } else {
                console.log('【导出】没有商品数据')
            }
        }

        // 7. 导出商品分类
        if (options.categories) {
            if (onProgress) onProgress('正在导出商品分类...')
            const data = await getCategoriesData()
            if (data.length > 0) {
                const fileName = generateFileName('商品分类')
                const worksheet = XLSX.utils.json_to_sheet(data)
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, '商品分类')
                XLSX.writeFile(workbook, fileName)
                exportedFiles.push(fileName)
                console.log(`【导出】已导出商品分类，共 ${data.length} 条，文件: ${fileName}`)
            } else {
                console.log('【导出】没有商品分类数据')
            }
        }

        // 8. 导出供应商
        if (options.suppliers) {
            if (onProgress) onProgress('正在导出供应商...')
            const data = await getSuppliersData()
            if (data.length > 0) {
                const fileName = generateFileName('供应商')
                const worksheet = XLSX.utils.json_to_sheet(data)
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, '供应商')
                XLSX.writeFile(workbook, fileName)
                exportedFiles.push(fileName)
                console.log(`【导出】已导出供应商，共 ${data.length} 条，文件: ${fileName}`)
            } else {
                console.log('【导出】没有供应商数据')
            }
        }

        // 9. 导出客户
        if (options.customers) {
            if (onProgress) onProgress('正在导出客户...')
            const data = await getCustomersData()
            if (data.length > 0) {
                const fileName = generateFileName('客户')
                const worksheet = XLSX.utils.json_to_sheet(data)
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, '客户')
                XLSX.writeFile(workbook, fileName)
                exportedFiles.push(fileName)
                console.log(`【导出】已导出客户，共 ${data.length} 条，文件: ${fileName}`)
            } else {
                console.log('【导出】没有客户数据')
            }
        }

        return { exportedFiles, count: exportedFiles.length }
    }

    // 导出为 Excel（兼容旧接口，导出到单个文件）
    const exportToExcel = async (userId, options, dateRange, onProgress) => {
        // 使用新的多文件导出方式
        return exportAllData(userId, options, dateRange, onProgress)
    }

    return {
        exportToExcel,
        generateFileName,
        formatDate,
        formatDateTime,
        formatMoney,
        getUserPhone,
        // 单独导出方法（供外部调用）
        exportPersonalAccounting: getPersonalAccountingData,
        exportBusinessAccounting: getBusinessAccountingData,
        exportPersonalSaving: getPersonalSavingData,
        exportGroupSaving: getGroupSavingData,
        exportInventory: getInventoryData,
        exportProducts: getProductsData,
        exportCategories: getCategoriesData,
        exportSuppliers: getSuppliersData,
        exportCustomers: getCustomersData
    }
}