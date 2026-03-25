// services/business/daily.service.js
import businessDataService from '@/services/cache/business-cache.service.js'
import baseService from './base.service.js'

/**
 * 日常记账业务服务
 */
class DailyService {
    /**
     * 添加日常记账记录
     */
    async addDailyRecord(record) {
        if (!record.date) {
            record.date = baseService.formatDateYMD(new Date())
        }
        return businessDataService.addDailyRecord(record)
    }

    /**
     * 批量添加日常记账记录
     */
    async addDailyRecords(records) {
        return businessDataService.addDailyRecords(records)
    }

    /**
     * 获取日常记账记录（支持日期筛选）
     */
    async getDailyRecords(dateRange = null) {
        const records = await businessDataService.getDailyRecordsWithDecrypt()

        if (dateRange) {
            return records.filter(r =>
                r.date >= dateRange.start && r.date <= dateRange.end
            ).sort((a, b) => new Date(b.date) - new Date(a.date))
        }

        return records.sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 获取指定日期的日常记账记录
     */
    async getDailyRecordsByDate(date) {
        const records = await this.getDailyRecords()
        return records.filter(r => r.date === date)
    }

    /**
     * 更新日常记账记录
     */
    async updateDailyRecord(id, data) {
        return businessDataService.updateDailyRecord(id, data)
    }

    /**
     * 删除日常记账记录
     */
    async deleteDailyRecord(id) {
        return businessDataService.deleteDailyRecord(id)
    }
}

export default new DailyService()