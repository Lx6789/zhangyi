<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay($event)">
    <div class="modal-content report-modal">
      <div class="modal-header report-header">
        <i class="fas fa-chart-pie" style="color: #80A492;"></i>
        <h3>报表分析</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="report-management">
          <!-- 报表类型切换 -->
          <div class="report-tabs">
            <button
                class="tab-btn"
                :class="{ active: reportType === 'income' }"
                @click="switchReportType('income')"
            >
              <i class="fas fa-money-bill-wave"></i> 收入报表
            </button>
            <button
                class="tab-btn"
                :class="{ active: reportType === 'expense' }"
                @click="switchReportType('expense')"
            >
              <i class="fas fa-receipt"></i> 支出报表
            </button>
            <button
                class="tab-btn"
                :class="{ active: reportType === 'profit' }"
                @click="switchReportType('profit')"
            >
              <i class="fas fa-chart-line"></i> 利润报表
            </button>
            <button
                class="tab-btn"
                :class="{ active: reportType === 'category' }"
                @click="switchReportType('category')"
            >
              <i class="fas fa-tags"></i> 分类统计
            </button>
          </div>

          <!-- 日期范围选择 -->
          <div class="date-range-section">
            <div class="date-range-tabs">
              <button
                  class="range-btn"
                  :class="{ active: dateRange === 'month' }"
                  @click="handleDateRangeChange('month')"
              >本月</button>
              <button
                  class="range-btn"
                  :class="{ active: dateRange === 'quarter' }"
                  @click="handleDateRangeChange('quarter')"
              >本季度</button>
              <button
                  class="range-btn"
                  :class="{ active: dateRange === 'year' }"
                  @click="handleDateRangeChange('year')"
              >本年</button>
              <button
                  class="range-btn"
                  :class="{ active: dateRange === 'custom' }"
                  @click="handleDateRangeChange('custom')"
              >自定义</button>
            </div>

            <!-- 自定义日期范围 -->
            <div v-if="dateRange === 'custom'" class="custom-date-range">
              <input
                  v-model="customStartDate"
                  type="date"
                  class="form-input"
                  @change="handleCustomDateChange"
              >
              <span>至</span>
              <input
                  v-model="customEndDate"
                  type="date"
                  class="form-input"
                  @change="handleCustomDateChange"
              >
            </div>
          </div>

          <!-- 数据汇总卡片 -->
          <div class="report-summary">
            <div class="summary-card">
              <div class="summary-label">总收入</div>
              <div class="summary-value income">¥{{ formatNumber(summary.totalIncome) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">总支出</div>
              <div class="summary-value expense">¥{{ formatNumber(summary.totalExpense) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">净利润</div>
              <div class="summary-value" :class="summary.totalProfit >= 0 ? 'income' : 'expense'">
                ¥{{ formatNumber(summary.totalProfit) }}
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-label">交易笔数</div>
              <div class="summary-value">{{ summary.transactionCount }}</div>
            </div>
          </div>

          <!-- 报表数据表格容器 -->
          <div class="report-table-container"
               :style="tableContainerStyle"
               :class="{ 'has-scroll': tableDataExceedsLimit }">
            <!-- 加载状态 - 骨架屏（带淡入淡出） -->
            <Transition name="fade">
              <div v-if="loading" class="skeleton-wrapper" key="skeleton">
                <div class="skeleton-table">
                  <div class="skeleton-header"></div>
                  <div class="skeleton-row" v-for="i in 5" :key="i"></div>
                  <div class="skeleton-row" v-for="i in 3" :key="`extra-${i}`"></div>
                </div>
              </div>
            </Transition>

            <!-- 报表内容 - 使用过渡动画 -->
            <Transition name="fade" mode="out-in">
              <div v-if="!loading" :key="reportType" class="report-table-wrapper">
                <!-- 收入报表 -->
                <table v-if="reportType === 'income'" class="report-table">
                  <thead>
                  <tr>
                    <th>销售渠道</th>
                    <th>交易笔数</th>
                    <th>金额</th>
                    <th>占比</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="item in currentReportData" :key="item.name">
                    <td>{{ item.name }}</td>
                    <td>{{ item.count }}</td>
                    <td class="amount income">¥{{ formatNumber(item.amount) }}</td>
                    <td>{{ item.percentage.toFixed(1) }}%</td>
                  </tr>
                  <tr v-if="currentReportData.length === 0">
                    <td colspan="4" class="empty-data">暂无收入数据</td>
                  </tr>
                  </tbody>
                </table>

                <!-- 支出报表 -->
                <table v-else-if="reportType === 'expense'" class="report-table">
                  <thead>
                  <tr>
                    <th>支出类型</th>
                    <th>具体项目</th>
                    <th>交易笔数</th>
                    <th>金额</th>
                    <th>占比</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="(item, index) in currentReportData" :key="index">
                    <td>{{ item.category }}</td>
                    <td>{{ item.subtype }}</td>
                    <td>{{ item.count }}</td>
                    <td class="amount expense">¥{{ formatNumber(item.amount) }}</td>
                    <td>{{ item.percentage.toFixed(1) }}%</td>
                  </tr>
                  <tr v-if="currentReportData.length === 0">
                    <td colspan="5" class="empty-data">暂无支出数据</td>
                  </tr>
                  </tbody>
                </table>

                <!-- 利润报表 -->
                <table v-else-if="reportType === 'profit'" class="report-table">
                  <thead>
                  <tr>
                    <th>日期</th>
                    <th>收入</th>
                    <th>支出</th>
                    <th>利润</th>
                    <th>交易笔数</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="item in currentReportData" :key="item.date">
                    <td>{{ formatDate(item.date) }}</td>
                    <td class="amount income">¥{{ formatNumber(item.income) }}</td>
                    <td class="amount expense">¥{{ formatNumber(item.expense) }}</td>
                    <td class="amount" :class="item.profit >= 0 ? 'income' : 'expense'">
                      ¥{{ formatNumber(item.profit) }}
                    </td>
                    <td>{{ item.count }}</td>
                  </tr>
                  <tr v-if="currentReportData.length === 0">
                    <td colspan="5" class="empty-data">暂无利润数据</td>
                  </tr>
                  </tbody>
                </table>

                <!-- 分类统计 -->
                <table v-else-if="reportType === 'category'" class="report-table">
                  <thead>
                  <tr>
                    <th>商品分类</th>
                    <th>收入</th>
                    <th>支出</th>
                    <th>利润</th>
                    <th>交易笔数</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="item in currentReportData" :key="item.category">
                    <td>{{ item.category }}</td>
                    <td class="amount income">¥{{ formatNumber(item.income) }}</td>
                    <td class="amount expense">¥{{ formatNumber(item.expense) }}</td>
                    <td class="amount" :class="item.profit >= 0 ? 'income' : 'expense'">
                      ¥{{ formatNumber(item.profit) }}
                    </td>
                    <td>{{ item.count }}</td>
                  </tr>
                  <tr v-if="currentReportData.length === 0">
                    <td colspan="5" class="empty-data">暂无分类数据</td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </Transition>
          </div>

          <!-- 操作按钮 -->
          <div class="report-actions">
            <button class="btn btn-secondary" @click="exportReport" :disabled="loading">
              <i class="fas fa-download"></i> 导出数据
            </button>
            <button class="btn btn-primary" @click="handleRefresh" :disabled="loading">
              <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i> 刷新数据
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import businessDataService from '@/services/business-data.service.js'
import reportExportService from '@/services/utils/report-export.service.js'
import {notificationService} from "@/services/index.js";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'export'])

// ==================== 状态 ====================
const loading = ref(false)
const reportType = ref('income')
const dateRange = ref('month')
const customStartDate = ref('')
const customEndDate = ref('')

// 缓存不同报表类型的数据
const reportDataCache = ref({
  income: [],
  expense: [],
  profit: [],
  category: []
})

// 当前显示的数据（用于平滑切换）
const currentDisplayData = ref([])

const summary = ref({
  totalIncome: 0,
  totalExpense: 0,
  totalProfit: 0,
  transactionCount: 0
})

// 记录上次加载的时间段
const lastLoadedRange = ref('')

// ==================== 计算属性 ====================

// 获取当前报表数据
const currentReportData = computed(() => {
  if (loading.value && currentDisplayData.value.length === 0) {
    return []
  }
  return currentDisplayData.value.length > 0
      ? currentDisplayData.value
      : (reportDataCache.value[reportType.value] || [])
})

// 判断表格数据是否超出限制（用于样式控制）
const tableDataExceedsLimit = computed(() => {
  const dataLength = currentReportData.value?.length || 0
  return dataLength > 5
})

// 计算表格容器高度
const tableContainerStyle = computed(() => {
  const dataLength = currentReportData.value?.length || 0
  const rowHeight = 52
  const headerHeight = 48
  const maxRows = 5

  if (dataLength === 0) {
    return { height: '200px' }
  }

  if (dataLength <= maxRows) {
    const contentHeight = dataLength * rowHeight + headerHeight
    return { height: `${contentHeight}px` }
  } else {
    const maxHeight = maxRows * rowHeight + headerHeight + 10
    return { height: `${maxHeight}px` }
  }
})

// ==================== 方法 ====================

// 切换报表类型
const switchReportType = async (type) => {
  if (type === reportType.value) return

  if (reportDataCache.value[type] && reportDataCache.value[type].length > 0) {
    currentDisplayData.value = reportDataCache.value[type]
  }

  reportType.value = type

  if (!reportDataCache.value[type] || reportDataCache.value[type].length === 0) {
    await loadReportData(false)
  }
}

// 处理日期范围变更
const handleDateRangeChange = (range) => {
  dateRange.value = range
}

// 处理自定义日期变更
const handleCustomDateChange = () => {
  if (customStartDate.value && customEndDate.value) {
    handleDateRangeChange('custom')
  }
}

// 处理刷新
const handleRefresh = () => {
  refreshData(true)
}

// 刷新数据
const refreshData = (showLoading = true) => {
  reportDataCache.value = {
    income: [],
    expense: [],
    profit: [],
    category: []
  }
  lastLoadedRange.value = ''
  loadReportData(showLoading)
}

// 获取日期范围
const getDateRange = () => {
  const today = new Date()
  let start = ''
  let end = today.toISOString().split('T')[0]

  switch (dateRange.value) {
    case 'month':
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
      break
    case 'quarter':
      const quarterMonth = Math.floor(today.getMonth() / 3) * 3
      start = new Date(today.getFullYear(), quarterMonth, 1).toISOString().split('T')[0]
      break
    case 'year':
      start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
      break
    case 'custom':
      start = customStartDate.value || start
      end = customEndDate.value || end
      break
  }

  return { start, end }
}

// 检查是否有有效缓存
const hasValidCache = () => {
  return ['income', 'expense', 'profit', 'category'].every(
      type => reportDataCache.value[type] && reportDataCache.value[type].length > 0
  )
}

// 保存缓存到 sessionStorage
const saveCacheToStorage = () => {
  try {
    const cacheData = {
      reportDataCache: reportDataCache.value,
      lastLoadedRange: lastLoadedRange.value,
      timestamp: Date.now()
    }
    sessionStorage.setItem('reportCache', JSON.stringify(cacheData))
  } catch (error) {
    console.error('保存缓存失败:', error)
  }
}

// 从 sessionStorage 恢复缓存
const restoreCacheFromStorage = () => {
  try {
    const cached = sessionStorage.getItem('reportCache')
    if (cached) {
      const { reportDataCache: cachedData, lastLoadedRange: cachedRange, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        reportDataCache.value = cachedData
        lastLoadedRange.value = cachedRange
        currentDisplayData.value = cachedData[reportType.value] || []
        return true
      }
    }
  } catch (error) {
    console.error('恢复缓存失败:', error)
  }
  return false
}

// 预加载其他报表类型的数据
const preloadOtherReports = async () => {
  const currentType = reportType.value
  const otherTypes = ['income', 'expense', 'profit', 'category'].filter(t => t !== currentType)

  for (const type of otherTypes) {
    if (!reportDataCache.value[type] || reportDataCache.value[type].length === 0) {
      await loadReportDataForType(type)
    }
  }
}

// 为特定类型加载数据
const loadReportDataForType = async (type) => {
  try {
    const range = getDateRange()
    const records = await businessDataService.getBusinessRecords(range)

    let data = []
    switch (type) {
      case 'income':
        data = processIncomeData(records.filter(r => r.type === '收入'))
        break
      case 'expense':
        data = processExpenseData(records.filter(r => r.type === '支出'))
        break
      case 'profit':
        data = processProfitData(records)
        break
      case 'category':
        data = processCategoryData(records)
        break
    }

    reportDataCache.value[type] = data
  } catch (error) {
    console.error(`预加载${type}数据失败:`, error)
  }
}

// 加载报表数据
const loadReportData = async (showLoading = true) => {
  if (loading.value) return

  if (showLoading) {
    loading.value = true
  }

  try {
    const range = getDateRange()
    const rangeKey = `${range.start}_${range.end}`

    if (lastLoadedRange.value === rangeKey && hasValidCache()) {
      currentDisplayData.value = reportDataCache.value[reportType.value] || []
      loading.value = false
      return
    }

    const records = await businessDataService.getBusinessRecords(range)

    if (!records || records.length === 0) {
      reportDataCache.value = {
        income: [],
        expense: [],
        profit: [],
        category: []
      }
      currentDisplayData.value = []
      summary.value = {
        totalIncome: 0,
        totalExpense: 0,
        totalProfit: 0,
        transactionCount: 0
      }
      loading.value = false
      return
    }

    const [incomeData, expenseData, profitData, categoryData] = await Promise.all([
      Promise.resolve(processIncomeData(records.filter(r => r.type === '收入'))),
      Promise.resolve(processExpenseData(records.filter(r => r.type === '支出'))),
      Promise.resolve(processProfitData(records)),
      Promise.resolve(processCategoryData(records))
    ])

    reportDataCache.value = {
      income: incomeData,
      expense: expenseData,
      profit: profitData,
      category: categoryData
    }
    lastLoadedRange.value = rangeKey

    currentDisplayData.value = reportDataCache.value[reportType.value] || []
    calculateSummary(records)

    saveCacheToStorage()
  } catch (error) {
    console.error('加载报表数据失败:', error)
    notificationService.showNotification('加载报表数据失败：' + error.message, 'error')
  } finally {
    if (showLoading) {
      loading.value = false
    }
  }
}

// 处理收入数据
const processIncomeData = (records) => {
  const grouped = {}
  let total = 0

  records.forEach(record => {
    if (record.businessType !== 'business') return

    const channel = record.channel || record.source || '其他'
    if (!grouped[channel]) {
      grouped[channel] = { name: channel, amount: 0, count: 0 }
    }
    grouped[channel].amount += record.amount || 0
    grouped[channel].count++
    total += record.amount || 0
  })

  return Object.values(grouped)
      .map(item => ({
        ...item,
        percentage: total > 0 ? (item.amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
}

// 处理支出数据
const processExpenseData = (records) => {
  const grouped = {}
  let total = 0

  records.forEach(record => {
    if (record.businessType !== 'business') return

    const category = record.category || '其他'
    const subtype = record.subtype || '其他'
    const key = `${category}-${subtype}`

    if (!grouped[key]) {
      grouped[key] = { category, subtype, amount: 0, count: 0 }
    }
    grouped[key].amount += record.amount || 0
    grouped[key].count++
    total += record.amount || 0
  })

  return Object.values(grouped)
      .map(item => ({
        ...item,
        percentage: total > 0 ? (item.amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
}

// 处理利润数据
const processProfitData = (records) => {
  const dailyData = {}

  records.forEach(record => {
    if (record.businessType !== 'business') return

    const date = record.date
    if (!dailyData[date]) {
      dailyData[date] = { date, income: 0, expense: 0, profit: 0, count: 0 }
    }

    if (record.type === '收入') {
      dailyData[date].income += record.amount || 0
    } else {
      dailyData[date].expense += record.amount || 0
    }
    dailyData[date].profit = dailyData[date].income - dailyData[date].expense
    dailyData[date].count++
  })

  return Object.values(dailyData).sort((a, b) => b.date.localeCompare(a.date))
}

// 处理分类数据
const processCategoryData = (records) => {
  const categoryStats = {}

  records.forEach(record => {
    if (record.businessType !== 'business') return

    let category = record.category || '其他'

    if (!categoryStats[category]) {
      categoryStats[category] = { category, income: 0, expense: 0, profit: 0, count: 0 }
    }

    if (record.type === '收入') {
      categoryStats[category].income += record.amount || 0
    } else {
      categoryStats[category].expense += record.amount || 0
    }
    categoryStats[category].profit = categoryStats[category].income - categoryStats[category].expense
    categoryStats[category].count++
  })

  return Object.values(categoryStats).sort((a, b) => b.profit - a.profit)
}

// 计算汇总数据
const calculateSummary = (records) => {
  let totalIncome = 0
  let totalExpense = 0
  let count = 0

  records.forEach(record => {
    if (record.businessType !== 'business') return

    if (record.type === '收入') {
      totalIncome += record.amount || 0
    } else {
      totalExpense += record.amount || 0
    }
    count++
  })

  summary.value = {
    totalIncome,
    totalExpense,
    totalProfit: totalIncome - totalExpense,
    transactionCount: count
  }
}

// 导出报表
const exportReport = async () => {
  try {
    const range = getDateRange()
    const records = await businessDataService.getBusinessRecords(range)

    if (!records || records.length === 0) {
      notificationService.showNotification('当前时间段没有数据可导出', 'error')
      return
    }

    await reportExportService.exportReport(reportType.value, records, range)
    emit('export', { type: reportType.value, range, records })
  } catch (error) {
    console.error('导出失败:', error)
    notificationService.showNotification('导出失败，请重试', 'error')
  }
}

// 格式化数字
const formatNumber = (num) => {
  if (num === undefined || num === null) return '0.00'
  const value = typeof num === 'number' ? num : parseFloat(num) || 0
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${month}.${day}`
}

// 设置默认日期
const setDefaultDates = () => {
  const today = new Date()
  customEndDate.value = today.toISOString().split('T')[0]
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  customStartDate.value = firstDay.toISOString().split('T')[0]
}

// 关闭模态框
const close = () => {
  emit('update:visible', false)
}

const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}

// 监听报表类型变化
watch(reportType, (newType) => {
  if (reportDataCache.value[newType]) {
    nextTick(() => {
      currentDisplayData.value = reportDataCache.value[newType]
    })
  }
}, { immediate: true })

// 监听日期范围变化
watch([dateRange, customStartDate, customEndDate], () => {
  if (props.visible) {
    const range = getDateRange()
    const rangeKey = `${range.start}_${range.end}`

    if (lastLoadedRange.value === rangeKey && hasValidCache()) {
      currentDisplayData.value = reportDataCache.value[reportType.value] || []
    } else {
      refreshData(true)
    }
  }
})

// 数据加载完成后预加载其他类型
watch(reportDataCache, () => {
  if (hasValidCache()) {
    return
  }
  setTimeout(() => {
    preloadOtherReports()
  }, 500)
}, { deep: true })

// 监听模态框显示状态
watch(() => props.visible, (newVal) => {
  if (newVal) {
    setDefaultDates()
    if (!restoreCacheFromStorage()) {
      refreshData(true)
    }
  }
})

// 初始化
onMounted(() => {
  setDefaultDates()
  if (props.visible) {
    if (!restoreCacheFromStorage()) {
      refreshData(true)
    }
  }
})
</script>

<style scoped>
/* ==================== 基础样式 ==================== */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.modal.active {
  opacity: 1;
  visibility: visible;
}

.modal-content {
  background-color: white;
  width: 90%;
  max-width: 500px;
  border-radius: 20px;
  padding: 0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-content.report-modal {
  max-width: 1000px;
  width: 95%;
}

/* ==================== 模态框头部 ==================== */
.modal-header {
  display: flex;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #D5EBE1;
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
  border-radius: 20px 20px 0 0;
}

.modal-header i {
  font-size: 24px;
  margin-right: 10px;
  color: #80A492;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #80A492;
  flex: 1;
  margin: 0;
}

.modal-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 24px;
  color: #99BCAC;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.modal-close:hover {
  background-color: #D5EBE1;
  color: #80A492;
}

.report-header {
  border-radius: 20px 20px 0 0;
}

/* ==================== 模态框主体 ==================== */
.modal-body {
  padding: 25px;
  overflow-y: auto;
  max-height: calc(85vh - 80px);
}

.report-management {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ==================== 报表类型切换 ==================== */
.report-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
  flex-wrap: wrap;
  background: white;
  border-radius: 12px;
}

.tab-btn {
  flex: 1;
  min-width: 110px;
  padding: 12px 10px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  background: none;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tab-btn i {
  font-size: 16px;
  color: #99BCAC;
  transition: all 0.3s;
}

.tab-btn:hover {
  background-color: #D5EBE1;
  color: #80A492;
}

.tab-btn:hover i {
  color: #80A492;
}

.tab-btn.active {
  background-color: #80A492;
  color: white;
  border-color: #80A492;
}

.tab-btn.active i {
  color: white;
}

/* ==================== 日期范围选择 ==================== */
.date-range-section {
  margin-bottom: 5px;
}

.date-range-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.range-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  background: none;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.range-btn:hover {
  background-color: #D5EBE1;
  color: #80A492;
}

.range-btn.active {
  background-color: #80A492;
  color: white;
  border-color: #80A492;
}

.custom-date-range {
  display: flex;
  gap: 10px;
  align-items: center;
  background: #f8fafc;
  padding: 15px;
  border-radius: 16px;
  border: 1px solid #D5EBE1;
}

.custom-date-range .form-input {
  flex: 1;
  padding: 12px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  background-color: white;
  transition: all 0.3s;
}

.custom-date-range .form-input:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.custom-date-range span {
  color: #80A492;
  font-size: 14px;
  font-weight: 500;
}

/* ==================== 数据汇总卡片 ==================== */
.report-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 5px;
}

.summary-card {
  padding: 20px 15px;
  background-color: white;
  border-radius: 16px;
  text-align: center;
  border: 1px solid #D5EBE1;
  transition: all 0.3s;
}

.summary-card:hover {
  box-shadow: 0 5px 15px rgba(128, 164, 146, 0.1);
  transform: translateY(-2px);
}

.summary-label {
  font-size: 13px;
  color: #999;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: #333;
}

.summary-value.income {
  color: #2ecc71;
}

.summary-value.expense {
  color: #e74c3c;
}

/* ==================== 报表表格容器 ==================== */
.report-table-container {
  position: relative;
  margin-bottom: 5px;
  border: 1px solid #D5EBE1;
  border-radius: 16px;
  background-color: white;
  overflow-y: auto;
  transition: height 0.3s ease;
}

.report-table-container.has-scroll {
  box-shadow: inset 0 -5px 5px -5px rgba(0, 0, 0, 0.1);
}

.report-table-wrapper {
  width: 100%;
  height: 100%;
}

/* ==================== 过渡动画 ==================== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ==================== 报表表格 ==================== */
.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background-color: white;
}

.report-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: white;
}

.report-table th {
  background: rgba(213, 235, 225, 0.3);
  color: #80A492;
  font-weight: 600;
  font-size: 14px;
  padding: 14px 15px;
  text-align: left;
  white-space: nowrap;
}

.report-table-container.has-scroll .report-table th {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.report-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #D5EBE1;
  color: #333;
}

.report-table tr:last-child td {
  border-bottom: none;
}

.report-table tbody tr:hover td {
  background-color: rgba(213, 235, 225, 0.1);
}

.report-table .amount {
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.report-table .amount.income {
  color: #2ecc71;
}

.report-table .amount.expense {
  color: #e74c3c;
}

.empty-data {
  text-align: center;
  color: #999;
  padding: 40px !important;
  font-style: italic;
  background: #f8fafc;
}

/* ==================== 骨架屏样式 ==================== */
.skeleton-wrapper {
  padding: 20px;
}

.skeleton-table {
  width: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.skeleton-header {
  height: 48px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 8px;
  margin-bottom: 10px;
}

.skeleton-row {
  height: 52px;
  margin: 8px 0;
  background: linear-gradient(90deg, #f5f5f5 25%, #e8e8e8 50%, #f5f5f5 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  animation-delay: 0.1s;
  border-radius: 8px;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ==================== 操作按钮 ==================== */
.report-actions {
  display: flex;
  gap: 15px;
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #D5EBE1;
}

.btn {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #D5EBE1;
  color: #80A492;
}

.btn-primary:hover:not(:disabled) {
  background-color: #B1D5C8;
}

.btn-secondary {
  background-color: white;
  color: #80A492;
  border: 1px solid #B1D5C8;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f8fafc;
  border-color: #80A492;
}

/* ==================== 表单输入 ==================== */
.form-input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  color: #333;
  transition: all 0.3s;
  background-color: white;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

/* ==================== 动画 ==================== */
.fa-spin {
  animation: spin 1s infinite linear;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ==================== 自定义滚动条 ==================== */
.modal-body::-webkit-scrollbar,
.report-table-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.modal-body::-webkit-scrollbar-track,
.report-table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb,
.report-table-container::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 3px;
  transition: background 0.3s;
}

.modal-body::-webkit-scrollbar-thumb:hover,
.report-table-container::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
  .modal-header {
    padding: 15px 20px;
  }

  .modal-header h3 {
    font-size: 18px;
  }

  .modal-body {
    padding: 20px;
  }

  .report-summary {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .report-tabs {
    flex-direction: column;
  }

  .tab-btn {
    width: 100%;
  }

  .date-range-tabs {
    flex-wrap: wrap;
  }

  .range-btn {
    min-width: calc(50% - 5px);
  }

  .custom-date-range {
    flex-direction: column;
  }

  .custom-date-range .form-input {
    width: 100%;
  }

  .report-actions {
    flex-direction: column;
  }

  .report-table {
    font-size: 13px;
  }

  .report-table th,
  .report-table td {
    padding: 10px 12px;
  }

  .summary-value {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .modal-content.report-modal {
    width: 95%;
  }

  .report-summary {
    grid-template-columns: 1fr;
  }

  .summary-card {
    padding: 15px;
  }

  .report-table-container {
    max-height: 350px;
  }

  .report-table th {
    font-size: 12px;
    padding: 10px 8px;
  }

  .report-table td {
    padding: 8px 8px;
    font-size: 12px;
  }
}
</style>