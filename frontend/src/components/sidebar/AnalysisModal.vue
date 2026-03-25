<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay">
    <div class="modal-content analysis-modal">
      <div class="modal-header">
        <i class="fas fa-chart-pie"></i>
        <h3>收支分析</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="analysis-container">
          <!-- 年份选择器 -->
          <div class="year-selector">
            <button class="year-nav" @click="prevYear" :disabled="loading">
              <i class="fas fa-chevron-left"></i>
            </button>
            <span class="current-year">{{ currentYear }}年</span>
            <button class="year-nav" @click="nextYear" :disabled="loading || currentYear >= new Date().getFullYear()">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>

          <!-- 加载状态 -->
          <div v-if="loading" class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>加载数据中...</p>
          </div>

          <div v-else>
            <!-- 年度概览卡片 -->
            <div class="year-overview">
              <div class="overview-card total-income">
                <div class="overview-icon">
                  <i class="fas fa-arrow-down"></i>
                </div>
                <div class="overview-info">
                  <span class="overview-label">年度总收入</span>
                  <span class="overview-value income-amount">¥{{ formatNumber(yearlyStats.totalIncome) }}</span>
                </div>
              </div>
              <div class="overview-card total-expense">
                <div class="overview-icon">
                  <i class="fas fa-arrow-up"></i>
                </div>
                <div class="overview-info">
                  <span class="overview-label">年度总支出</span>
                  <span class="overview-value expense-amount">¥{{ formatNumber(yearlyStats.totalExpense) }}</span>
                </div>
              </div>
              <div class="overview-card balance">
                <div class="overview-icon">
                  <i class="fas fa-wallet"></i>
                </div>
                <div class="overview-info">
                  <span class="overview-label">年度结余</span>
                  <span class="overview-value" :class="yearlyStats.balance >= 0 ? 'income-amount' : 'expense-amount'">
                    ¥{{ formatNumber(yearlyStats.balance) }}
                  </span>
                </div>
              </div>
              <div class="overview-card avg-month">
                <div class="overview-icon">
                  <i class="fas fa-chart-line"></i>
                </div>
                <div class="overview-info">
                  <span class="overview-label">月均支出</span>
                  <span class="overview-value expense-amount">¥{{ formatNumber(yearlyStats.avgExpense) }}</span>
                </div>
              </div>
            </div>

            <!-- 月度趋势图表 -->
            <div class="chart-section">
              <h4>
                <i class="fas fa-chart-line"></i>
                月度收支趋势
              </h4>
              <div class="monthly-chart">
                <div class="chart-bars">
                  <div
                      v-for="month in monthlyData"
                      :key="month.month"
                      class="chart-bar-container"
                      :title="`${month.month}月 - 收入: ¥${formatNumber(month.income)} 支出: ¥${formatNumber(month.expense)}`"
                  >
                    <div class="chart-bars-wrapper">
                      <div
                          class="bar-income"
                          :style="{ height: getBarHeight(month.income, maxAmount) + '%' }"
                      ></div>
                      <div
                          class="bar-expense"
                          :style="{ height: getBarHeight(month.expense, maxAmount) + '%' }"
                      ></div>
                    </div>
                    <span class="bar-label">{{ month.month }}月</span>
                  </div>
                </div>
                <div class="chart-legend">
                  <span class="legend-item">
                    <span class="legend-color income-color"></span>
                    收入
                  </span>
                  <span class="legend-item">
                    <span class="legend-color expense-color"></span>
                    支出
                  </span>
                </div>
              </div>
            </div>

            <!-- 分类统计 - 收入分类 -->
            <div class="category-section" v-if="incomeCategories.length > 0">
              <h4>
                <i class="fas fa-chart-pie"></i>
                收入分类统计
              </h4>
              <div class="category-list">
                <div
                    v-for="cat in incomeCategories"
                    :key="cat.name"
                    class="category-item"
                >
                  <div class="category-info">
                    <span class="category-name">{{ cat.name }}</span>
                    <span class="category-amount income-amount">¥{{ formatNumber(cat.amount) }}</span>
                  </div>
                  <div class="category-progress">
                    <div
                        class="progress-bar income-progress"
                        :style="{ width: cat.percentage + '%' }"
                    ></div>
                    <span class="category-percentage">{{ cat.percentage }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 分类统计 - 支出分类 -->
            <div class="category-section" v-if="expenseCategories.length > 0">
              <h4>
                <i class="fas fa-chart-pie"></i>
                支出分类统计
              </h4>
              <div class="category-list">
                <div
                    v-for="cat in expenseCategories"
                    :key="cat.name"
                    class="category-item"
                >
                  <div class="category-info">
                    <span class="category-name">{{ cat.name }}</span>
                    <span class="category-amount expense-amount">¥{{ formatNumber(cat.amount) }}</span>
                  </div>
                  <div class="category-progress">
                    <div
                        class="progress-bar expense-progress"
                        :style="{ width: cat.percentage + '%' }"
                    ></div>
                    <span class="category-percentage">{{ cat.percentage }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 业务类型对比 -->
            <div class="business-compare">
              <h4>
                <i class="fas fa-chart-simple"></i>
                业务类型对比
              </h4>
              <div class="compare-cards">
                <div class="compare-card personal">
                  <div class="compare-icon">
                    <i class="fas fa-user"></i>
                  </div>
                  <div class="compare-info">
                    <span class="compare-label">个人记账</span>
                    <div class="compare-stats">
                      <span class="income-text">收入 ¥{{ formatNumber(businessStats.personal.income) }}</span>
                      <span class="expense-text">支出 ¥{{ formatNumber(businessStats.personal.expense) }}</span>
                    </div>
                    <span class="compare-balance" :class="businessStats.personal.balance >= 0 ? 'income-text' : 'expense-text'">
                      结余 ¥{{ formatNumber(businessStats.personal.balance) }}
                    </span>
                  </div>
                </div>
                <div class="compare-card business">
                  <div class="compare-icon">
                    <i class="fas fa-store"></i>
                  </div>
                  <div class="compare-info">
                    <span class="compare-label">生意记账</span>
                    <div class="compare-stats">
                      <span class="income-text">收入 ¥{{ formatNumber(businessStats.business.income) }}</span>
                      <span class="expense-text">支出 ¥{{ formatNumber(businessStats.business.expense) }}</span>
                    </div>
                    <span class="compare-balance" :class="businessStats.business.balance >= 0 ? 'income-text' : 'expense-text'">
                      结余 ¥{{ formatNumber(businessStats.business.balance) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 无数据提示 -->
            <div v-if="hasNoData" class="no-data-message">
              <i class="fas fa-chart-simple"></i>
              <p>{{ currentYear }}年暂无收支数据</p>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="modal-btn modal-cancel" @click="close">
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import businessDataService from '@/services/cache/business-cache.service.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'close'])

// ==================== 状态 ====================
const loading = ref(false)
const currentYear = ref(new Date().getFullYear())
const allRecords = ref([])

// ==================== 计算属性 ====================

// 获取当前年份的记录
const yearRecords = computed(() => {
  return allRecords.value.filter(record => {
    const year = record.date ? record.date.split('-')[0] : ''
    return year === String(currentYear.value)
  })
})

// 月度数据（1-12月）
const monthlyData = computed(() => {
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expense: 0,
    balance: 0
  }))

  yearRecords.value.forEach(record => {
    const month = parseInt(record.date.split('-')[1])
    const amount = parseFloat(record.amount) || 0
    if (record.type === '收入') {
      months[month - 1].income += amount
    } else {
      months[month - 1].expense += amount
    }
  })

  months.forEach(m => {
    m.balance = m.income - m.expense
  })

  return months
})

// 年度统计
const yearlyStats = computed(() => {
  let totalIncome = 0
  let totalExpense = 0
  let monthsWithData = 0

  monthlyData.value.forEach(month => {
    totalIncome += month.income
    totalExpense += month.expense
    if (month.income > 0 || month.expense > 0) {
      monthsWithData++
    }
  })

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    avgExpense: monthsWithData > 0 ? totalExpense / monthsWithData : 0
  }
})

// 收入分类统计
const incomeCategories = computed(() => {
  const categories = {}

  yearRecords.value.forEach(record => {
    if (record.type === '收入') {
      const category = record.category || '其他'
      const amount = parseFloat(record.amount) || 0
      if (!categories[category]) {
        categories[category] = 0
      }
      categories[category] += amount
    }
  })

  const total = Object.values(categories).reduce((sum, val) => sum + val, 0)

  return Object.entries(categories)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
})

// 支出分类统计
const expenseCategories = computed(() => {
  const categories = {}

  yearRecords.value.forEach(record => {
    if (record.type === '支出') {
      const category = record.category || '其他'
      const amount = parseFloat(record.amount) || 0
      if (!categories[category]) {
        categories[category] = 0
      }
      categories[category] += amount
    }
  })

  const total = Object.values(categories).reduce((sum, val) => sum + val, 0)

  return Object.entries(categories)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
})

// 业务类型统计
const businessStats = computed(() => {
  const stats = {
    personal: { income: 0, expense: 0, balance: 0 },
    business: { income: 0, expense: 0, balance: 0 }
  }

  yearRecords.value.forEach(record => {
    const amount = parseFloat(record.amount) || 0
    const businessType = record.businessType || 'personal'
    const type = record.type === '收入' ? 'income' : 'expense'

    if (businessType === 'personal' || businessType === '个人记账') {
      stats.personal[type] += amount
    } else {
      stats.business[type] += amount
    }
  })

  stats.personal.balance = stats.personal.income - stats.personal.expense
  stats.business.balance = stats.business.income - stats.business.expense

  return stats
})

// 最大金额（用于计算柱状图高度）
const maxAmount = computed(() => {
  let max = 0
  monthlyData.value.forEach(month => {
    max = Math.max(max, month.income, month.expense)
  })
  return max || 1
})

// 是否有数据
const hasNoData = computed(() => {
  return yearlyStats.value.totalIncome === 0 && yearlyStats.value.totalExpense === 0
})

// ==================== 方法 ====================

// 加载所有记录
const loadRecords = async () => {
  loading.value = true
  try {
    const records = await businessDataService.getAllBusinessRecords()
    allRecords.value = records
    console.log(`加载了 ${allRecords.value.length} 条记录用于分析`)
  } catch (error) {
    console.error('加载记录失败:', error)
    allRecords.value = []
  } finally {
    loading.value = false
  }
}

// 上一年
const prevYear = () => {
  currentYear.value--
}

// 下一年
const nextYear = () => {
  if (currentYear.value < new Date().getFullYear()) {
    currentYear.value++
  }
}

// 计算柱状图高度百分比
const getBarHeight = (value, max) => {
  if (max === 0) return 0
  return (value / max) * 80 // 最大高度80%
}

// 格式化数字
const formatNumber = (num) => {
  if (num === undefined || num === null) return '0.00'
  return parseFloat(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 关闭弹框
const close = () => {
  emit('update:visible', false)
  emit('close')
}

// 点击遮罩层关闭
const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}

// 监听弹框显示
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadRecords()
  }
})
</script>

<style scoped>
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
  background-color: var(--white);
  width: 90%;
  max-width: 800px;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-height: 85vh;
  /* 隐藏外层滚动条 */
  overflow-y: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--primary-color);
  flex-shrink: 0;
}

.modal-header i {
  font-size: 24px;
  margin-right: 10px;
  color: var(--accent-color);
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--accent-color);
  flex: 1;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--tertiary-color);
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
  background-color: var(--primary-color);
  color: var(--accent-color);
}

.modal-body {
  margin-bottom: 20px;
  /* 内容区域滚动 */
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

/* modal-body 自定义滚动条样式 */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}

/* Firefox 滚动条样式 */
.modal-body {
  scrollbar-width: thin;
  scrollbar-color: #B1D5C8 #f1f1f1;
}

.modal-footer {
  display: flex;
  justify-content: center;
  padding-top: 15px;
  border-top: 1px solid var(--primary-color);
  flex-shrink: 0;
}

.modal-btn {
  padding: 12px 30px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.modal-cancel {
  background-color: var(--primary-color);
  color: var(--accent-color);
}

.modal-cancel:hover {
  background-color: var(--secondary-color);
}

/* 分析容器 */
.analysis-container {
  padding: 5px 0;
}

/* 年份选择器 */
.year-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 25px;
}

.year-nav {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background-color: var(--primary-color);
  color: var(--accent-color);
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.year-nav:hover:not(:disabled) {
  background-color: var(--secondary-color);
  transform: scale(1.05);
}

.year-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.current-year {
  font-size: 24px;
  font-weight: 600;
  color: var(--accent-color);
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-light);
}

.loading-state i {
  font-size: 48px;
  color: var(--accent-color);
  margin-bottom: 15px;
}

/* 年度概览卡片 */
.year-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 30px;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 15px;
  transition: all 0.3s;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow);
}

.overview-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background-color: var(--white);
}

.total-income .overview-icon {
  color: #2ecc71;
}

.total-expense .overview-icon {
  color: #e74c3c;
}

.balance .overview-icon {
  color: #3498db;
}

.avg-month .overview-icon {
  color: #f39c12;
}

.overview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overview-label {
  font-size: 12px;
  color: var(--text-light);
}

.overview-value {
  font-size: 18px;
  font-weight: 600;
}

/* 图表区域 */
.chart-section,
.category-section,
.business-compare {
  margin-bottom: 30px;
}

.chart-section h4,
.category-section h4,
.business-compare h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-color);
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-section h4 i,
.category-section h4 i,
.business-compare h4 i {
  font-size: 18px;
}

/* 月度柱状图 */
.monthly-chart {
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 15px;
  padding: 20px;
}

.chart-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200px;
  margin-bottom: 15px;
}

.chart-bar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 50px;
}

.chart-bars-wrapper {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 160px;
  width: 100%;
  justify-content: center;
}

.bar-income,
.bar-expense {
  width: 20px;
  transition: height 0.5s ease;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
}

.bar-income {
  background: linear-gradient(180deg, #2ecc71, #27ae60);
}

.bar-expense {
  background: linear-gradient(180deg, #e74c3c, #c0392b);
}

.bar-label {
  font-size: 11px;
  color: var(--text-light);
  margin-top: 8px;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-light);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.legend-color.income-color {
  background: #2ecc71;
}

.legend-color.expense-color {
  background: #e74c3c;
}

/* 分类列表 */
.category-list {
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 15px;
  padding: 15px;
}

.category-item {
  margin-bottom: 15px;
}

.category-item:last-child {
  margin-bottom: 0;
}

.category-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 13px;
}

.category-name {
  color: var(--text-dark);
  font-weight: 500;
}

.category-amount {
  font-weight: 600;
}

.category-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  height: 8px;
  border-radius: 4px;
  transition: width 0.5s ease;
  background-color: #e0e0e0;
}

.income-progress {
  background: linear-gradient(90deg, #2ecc71, #27ae60);
}

.expense-progress {
  background: linear-gradient(90deg, #e74c3c, #c0392b);
}

.category-percentage {
  font-size: 11px;
  color: var(--text-light);
  min-width: 40px;
}

/* 业务类型对比 */
.compare-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.compare-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 15px;
  transition: all 0.3s;
}

.compare-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow);
}

.compare-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background-color: var(--white);
}

.compare-card.personal .compare-icon {
  color: #3498db;
}

.compare-card.business .compare-icon {
  color: #f39c12;
}

.compare-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compare-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-color);
}

.compare-stats {
  display: flex;
  gap: 15px;
  font-size: 13px;
}

.compare-stats span {
  font-weight: 500;
}

.compare-balance {
  font-size: 14px;
  font-weight: 600;
}

/* 颜色辅助类 */
.income-amount {
  color: #2ecc71;
}

.expense-amount {
  color: #e74c3c;
}

.income-text {
  color: #2ecc71;
}

.expense-text {
  color: #e74c3c;
}

/* 无数据提示 */
.no-data-message {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-light);
}

.no-data-message i {
  font-size: 60px;
  color: var(--secondary-color);
  margin-bottom: 15px;
}

.no-data-message p {
  font-size: 14px;
}

/* 响应式 */
@media (max-width: 600px) {
  .year-overview {
    grid-template-columns: 1fr;
  }

  .compare-cards {
    grid-template-columns: 1fr;
  }

  .chart-bars {
    height: 150px;
  }

  .chart-bars-wrapper {
    height: 120px;
  }

  .bar-income,
  .bar-expense {
    width: 12px;
  }

  .overview-value {
    font-size: 16px;
  }
}
</style>