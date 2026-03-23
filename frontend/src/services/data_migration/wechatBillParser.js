// data_migration/wechatBillParser.js

/**
 * 解析微信支付账单Excel文件并转换为daily_records格式
 */
export class WechatBillParser {
    constructor(userId) {
        this.userId = userId
    }

    /**
     * 解析微信账单Excel数据
     * @param {Array} excelData - 从Excel解析出的原始数据（从第17行开始）
     * @returns {Array} 转换后的daily_records数据
     */
    parseWechatBill(excelData) {
        const records = []

        // 跳过表头行（第17行是表头，数据从第18行开始）
        // 假设excelData是从第17行开始的数据
        for (let i = 1; i < excelData.length; i++) {
            const row = excelData[i]
            if (!row || row.length < 10) continue

            const transactionTime = row[0]  // 交易时间
            const transactionType = row[1]   // 交易类型
            const counterparty = row[2]      // 交易对方
            const goods = row[3]              // 商品
            const incomeExpense = row[4]      // 收/支
            const amountStr = row[5]          // 金额(元)
            const paymentMethod = row[6]      // 支付方式
            const status = row[7]             // 当前状态
            const transactionNo = row[8]      // 交易单号
            const merchantNo = row[9]         // 商户单号
            const remark = row[10]            // 备注

            // 跳过无效行
            if (!transactionTime || !incomeExpense) continue

            // 解析金额
            let amount = 0
            if (amountStr) {
                // 去除¥符号和空格
                const cleanAmount = String(amountStr).replace(/[¥,]/g, '').trim()
                amount = parseFloat(cleanAmount)
                if (isNaN(amount)) continue
            }

            // 解析日期（从交易时间中提取）
            let dateStr = ''
            if (transactionTime) {
                const dateMatch = transactionTime.match(/^(\d{4}-\d{2}-\d{2})/)
                if (dateMatch) {
                    dateStr = dateMatch[1]
                }
            }

            // 根据交易对方和商品自动判断分类
            const category = this.inferCategory(transactionType, counterparty, goods)

            // 根据收/支判断类型
            const type = incomeExpense === '收入' ? '收入' : '支出'

            // 如果type是支出，但amount是正数，需要转为负数（或者存储为正数，根据你的业务逻辑）
            // 根据你提供的格式，amount存储的是正数，通过type区分收支

            // 生成唯一ID
            const id = Date.now() + Math.random().toString(36).substr(2, 9)
            const timestamp = new Date().toISOString()

            // 构建daily_records对象
            const record = {
                id: id,
                date: dateStr,
                type: type,
                category: category,
                amount: amount,
                note: this.buildNote(transactionType, counterparty, goods, remark),
                businessType: 'personal',  // 个人记账
                paymentMethod: this.mapPaymentMethod(paymentMethod, incomeExpense),
                userId: this.userId,
                source: this.extractSource(counterparty, goods),
                syncStatus: 'pending',
                createTime: timestamp,
                updateTime: timestamp,
                timestamp: timestamp,
                // 保留原始微信账单信息供参考
                wechatInfo: {
                    transactionType: transactionType,
                    counterparty: counterparty,
                    goods: goods,
                    transactionNo: transactionNo,
                    merchantNo: merchantNo,
                    status: status
                }
            }

            records.push(record)
        }

        return records
    }

    /**
     * 推断分类
     */
    inferCategory(transactionType, counterparty, goods) {
        // 根据交易对方判断
        const counterpartyLower = (counterparty || '').toLowerCase()
        const goodsLower = (goods || '').toLowerCase()

        // 餐饮类
        if (counterpartyLower.includes('餐饮') ||
            counterpartyLower.includes('餐厅') ||
            counterpartyLower.includes('美食') ||
            goodsLower.includes('餐饮')) {
            return '餐饮'
        }

        // 超市/购物
        if (counterpartyLower.includes('超市') ||
            counterpartyLower.includes('便利店') ||
            counterpartyLower.includes('购物') ||
            counterpartyLower.includes('佳源生活超市')) {
            return '购物'
        }

        // 游戏/娱乐
        if (counterpartyLower.includes('腾讯天游') ||
            counterpartyLower.includes('哔哩哔哩') ||
            counterpartyLower.includes('宽娱数码') ||
            counterpartyLower.includes('王者荣耀') ||
            goodsLower.includes('游戏') ||
            goodsLower.includes('漫币') ||
            goodsLower.includes('王者荣耀')) {
            return '游戏娱乐'
        }

        // 交通出行
        if (counterpartyLower.includes('中铁网络') ||
            counterpartyLower.includes('铁路') ||
            goodsLower.includes('12306')) {
            return '交通出行'
        }

        // 通讯/网络
        if (counterpartyLower.includes('广电') ||
            counterpartyLower.includes('腾讯云') ||
            counterpartyLower.includes('网络')) {
            return '通讯网络'
        }

        // 快递物流
        if (counterpartyLower.includes('网飞物联') ||
            counterpartyLower.includes('快递')) {
            return '物流快递'
        }

        // 转账（收入）
        if (transactionType === '转账') {
            return '转账'
        }

        // 默认分类
        return '其他'
    }

    /**
     * 构建备注信息
     */
    buildNote(transactionType, counterparty, goods, remark) {
        const parts = []
        if (transactionType && transactionType !== '商户消费') {
            parts.push(`类型:${transactionType}`)
        }
        if (counterparty && counterparty !== '/') {
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

    /**
     * 映射支付方式
     */
    mapPaymentMethod(paymentMethod, incomeExpense) {
        if (incomeExpense === '收入') {
            return '微信转账'
        }

        if (!paymentMethod || paymentMethod === '/') {
            return '微信支付'
        }

        if (paymentMethod.includes('零钱')) {
            return '微信零钱'
        }
        if (paymentMethod.includes('银行卡')) {
            return '银行卡'
        }

        return paymentMethod
    }

    /**
     * 提取来源信息
     */
    extractSource(counterparty, goods) {
        if (counterparty && counterparty !== '/') {
            return counterparty
        }
        if (goods && goods !== '/') {
            return goods
        }
        return '微信支付'
    }

    /**
     * 批量导入到IndexedDB
     */
    async importToDailyRecords(records) {
        let successCount = 0
        let failCount = 0

        for (const record of records) {
            try {
                // 使用IndexedDBService的add方法
                await indexedDBService.add('daily_records', record)
                successCount++
            } catch (error) {
                console.error('导入记录失败:', error, record)
                failCount++
            }
        }

        return { successCount, failCount, total: records.length }
    }
}