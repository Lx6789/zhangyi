<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay">
    <div class="modal-content history-modal" @click.stop>
      <div class="modal-header">
        <i class="fas fa-history"></i>
        <h3>历史记录</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <!-- 筛选器 -->
        <div class="filter-bar">
          <div class="filter-group">
            <!-- 替换为自定义选择器：记录类型 -->
            <div class="filter-select-custom" @click="openTypeSelector">
              {{ getTypeText(filterType) }}
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
          <div class="filter-group">
            <!-- 替换为自定义选择器：业务类型 -->
            <div class="filter-select-custom" @click="openBusinessTypeSelector">
              {{ getBusinessTypeText(filterBusinessType) }}
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
          <div class="filter-group">
            <!-- 替换为自定义选择器：年份 -->
            <div class="filter-select-custom" @click="openYearSelector">
              {{ getYearText(filterYear) }}
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
          <button class="filter-reset" @click="resetFilters" title="重置筛选">
            <i class="fas fa-undo-alt"></i>
          </button>
        </div>

        <!-- 统计摘要 -->
        <div class="history-stats" v-if="!loading">
          <div class="stat-item">
            <span class="stat-label">总记录数</span>
            <span class="stat-value">{{ totalStats.count }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">总收入</span>
            <span class="stat-value income-amount">¥{{ formatNumber(totalStats.totalIncome) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">结余</span>
            <span class="stat-value" :class="totalStats.balance >= 0 ? 'income-amount' : 'expense-amount'">
              ¥{{ formatNumber(totalStats.balance) }}
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">总支出</span>
            <span class="stat-value expense-amount">¥{{ formatNumber(totalStats.totalExpense) }}</span>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>加载中...</p>
        </div>

        <!-- 记录列表 -->
        <div v-else-if="filteredRecords.length === 0" class="empty-records">
          <i class="fas fa-receipt"></i>
          <p>暂无收支记录</p>
        </div>

        <div v-else class="records-list">
          <template v-for="(records, year) in groupedRecords" :key="year">
            <div class="year-group">
              <!-- 年份标题 -->
              <div class="year-header" @click="toggleYearGroup(year)">
                <div class="year-header-left">
                  <i class="fas fa-calendar-alt"></i>
                  <span>{{ year }}年</span>
                  <span class="year-count">{{ records.length }}笔</span>
                </div>
                <div class="year-header-right">
                  <div class="year-stats">
                    <div class="stat-row income-row">
                      <span class="stat-label">收入</span>
                      <span class="stat-value income-amount">¥{{ formatNumber(getYearStats(records).income) }}</span>
                    </div>
                    <div class="stat-row expense-row">
                      <span class="stat-label">支出</span>
                      <span class="stat-value expense-amount">¥{{ formatNumber(getYearStats(records).expense) }}</span>
                    </div>
                  </div>
                  <i class="fas expand-icon" :class="expandedYears[year] ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </div>
              </div>

              <!-- 该年的记录列表 -->
              <transition name="slide-fade">
                <div v-if="expandedYears[year]" class="year-records">
                  <div
                      v-for="record in records"
                      :key="record.id"
                      class="record-item"
                      :class="record.type === '收入' ? 'record-income' : 'record-expense'"
                      @click="toggleRecordExpand(record.id)"
                  >
                    <!-- 缩略信息 -->
                    <div class="record-summary">
                      <div class="record-icon">
                        <i :class="record.type === '收入' ? 'fas fa-money-bill-wave' : 'fas fa-receipt'"></i>
                      </div>
                      <div class="record-info">
                        <div class="record-title">
                          <span class="record-category">{{ record.category }}</span>
                          <span v-if="record.businessType === 'business'" class="business-badge">生意</span>
                          <span v-else class="personal-badge">个人</span>
                        </div>
                        <div class="record-meta">
                          <span class="record-date">{{ formatDate(record.date) }}</span>
                          <span class="record-type-badge" :class="record.type === '收入' ? 'income-badge' : 'expense-badge'">
                            {{ record.type }}
                          </span>
                        </div>
                      </div>
                      <div class="record-amount">
                        <span :class="record.type === '收入' ? 'income-amount' : 'expense-amount'">
                          {{ record.type === '收入' ? '+' : '-' }}¥ {{ formatNumber(record.amount) }}
                        </span>
                      </div>
                      <div class="expand-icon">
                        <i :class="expandedRecordId === record.id ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                      </div>
                    </div>

                    <!-- 展开的详细信息 -->
                    <div v-if="expandedRecordId === record.id" class="record-detail">
                      <div class="detail-grid">
                        <div class="detail-item">
                          <span class="detail-label">类型：</span>
                          <span class="detail-value" :class="record.type === '收入' ? 'income-text' : 'expense-text'">
                            {{ record.type }}
                          </span>
                        </div>
                        <div class="detail-item">
                          <span class="detail-label">分类：</span>
                          <span class="detail-value">{{ record.category }}</span>
                        </div>
                        <div v-if="record.type === '收入' && record.source" class="detail-item">
                          <span class="detail-label">来源：</span>
                          <span class="detail-value">{{ record.source }}</span>
                        </div>
                        <div class="detail-item">
                          <span class="detail-label">金额：</span>
                          <span class="detail-value" :class="record.type === '收入' ? 'income-amount' : 'expense-amount'">
                            ¥{{ formatNumber(record.amount) }}
                          </span>
                        </div>
                        <div class="detail-item">
                          <span class="detail-label">日期：</span>
                          <span class="detail-value">{{ formatFullDate(record.date) }}</span>
                        </div>
                        <div v-if="record.type === '收入' && record.paymentMethod" class="detail-item">
                          <span class="detail-label">收款方式：</span>
                          <span class="detail-value">{{ record.paymentMethod }}</span>
                        </div>
                        <div v-if="record.type === '支出' && record.paymentMethod" class="detail-item">
                          <span class="detail-label">支付方式：</span>
                          <span class="detail-value">{{ record.paymentMethod }}</span>
                        </div>
                        <div v-if="record.type === '支出' && record.supplier && record.supplier !== '无'" class="detail-item">
                          <span class="detail-label">供应商：</span>
                          <span class="detail-value">{{ record.supplier }}</span>
                        </div>
                        <div v-if="record.type === '收入' && record.customerName" class="detail-item">
                          <span class="detail-label">客户：</span>
                          <span class="detail-value">{{ record.customerName }}</span>
                        </div>
                        <div v-if="record.note" class="detail-item full-width">
                          <span class="detail-label">备注：</span>
                          <span class="detail-value note-text">{{ record.note }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </template>
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
import { ref, computed, reactive, watch, onMounted } from 'vue'
import businessDataService from '@/services/cache/business-cache.service.js'
import notificationService from '@/services/utils/notification.service.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'close'])

// ==================== 状态 ====================
const loading = ref(false)
const allRecords = ref([])

// 筛选条件
const filterType = ref('all') // all, income, expense
const filterBusinessType = ref('all') // all, personal, business
const filterYear = ref('all') // all 或具体年份

// 展开状态
const expandedRecordId = ref(null)
const expandedYears = reactive({})

// ==================== 计算属性 ====================

// 可用的年份列表
const availableYears = computed(() => {
  const years = new Set()
  allRecords.value.forEach(record => {
    if (record.date) {
      const year = record.date.split('-')[0]
      years.add(year)
    }
  })
  return Array.from(years).sort((a, b) => b - a)
})

// 筛选后的记录
const filteredRecords = computed(() => {
  let records = [...allRecords.value]

  // 按类型筛选
  if (filterType.value === 'income') {
    records = records.filter(r => r.type === '收入')
  } else if (filterType.value === 'expense') {
    records = records.filter(r => r.type === '支出')
  }

  // 按业务类型筛选
  if (filterBusinessType.value !== 'all') {
    records = records.filter(r => r.businessType === filterBusinessType.value)
  }

  // 按年份筛选
  if (filterYear.value !== 'all') {
    records = records.filter(r => {
      const year = r.date ? r.date.split('-')[0] : ''
      return year === filterYear.value
    })
  }

  // 按日期倒序排序
  return records.sort((a, b) => new Date(b.date) - new Date(a.date))
})

// 按年份分组
const groupedRecords = computed(() => {
  const groups = {}

  filteredRecords.value.forEach(record => {
    const year = record.date ? record.date.split('-')[0] : '未知'
    if (!groups[year]) {
      groups[year] = []
    }
    groups[year].push(record)
  })

  // 按年份倒序排序，并初始化折叠状态
  return Object.keys(groups)
      .sort((a, b) => b - a)
      .reduce((acc, year) => {
        acc[year] = groups[year]
        // 默认展开最新的年份
        if (expandedYears[year] === undefined && Object.keys(acc).length === 1) {
          expandedYears[year] = true
        }
        return acc
      }, {})
})

// 总统计
const totalStats = computed(() => {
  let totalIncome = 0
  let totalExpense = 0

  filteredRecords.value.forEach(record => {
    const amount = parseFloat(record.amount) || 0
    if (record.type === '收入') {
      totalIncome += amount
    } else {
      totalExpense += amount
    }
  })

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    count: filteredRecords.value.length
  }
})

// ==================== 自定义选择器方法 ====================

// 打开记录类型选择器
const openTypeSelector = async () => {
  const items = [
    { label: '全部记录', value: 'all', icon: '📋' },
    { label: '仅收入', value: 'income', icon: '💰' },
    { label: '仅支出', value: 'expense', icon: '💸' }
  ]

  const result = await notificationService.selectList({
    title: '选择记录类型',
    items
  })

  if (result !== null) {
    filterType.value = result
  }
}

// 打开业务类型选择器
const openBusinessTypeSelector = async () => {
  const items = [
    { label: '全部类型', value: 'all', icon: '📊' },
    { label: '个人记账', value: 'personal', icon: '👤' },
    { label: '生意记账', value: 'business', icon: '🏪' }
  ]

  const result = await notificationService.selectList({
    title: '选择记账类型',
    items
  })

  if (result !== null) {
    filterBusinessType.value = result
  }
}

// 打开年份选择器
const openYearSelector = async () => {
  const items = [
    { label: '全部年份', value: 'all', icon: '🗓️' }
  ]

  // 动态添加可用年份
  availableYears.value.forEach(year => {
    items.push({
      label: `${year}年`,
      value: year,
      icon: '📅'
    })
  })

  const result = await notificationService.selectList({
    title: '选择年份',
    items
  })

  if (result !== null) {
    filterYear.value = result
  }
}

// 获取类型显示文本
const getTypeText = (value) => {
  const map = {
    all: '全部记录',
    income: '仅收入',
    expense: '仅支出'
  }
  return map[value] || value
}

// 获取业务类型显示文本
const getBusinessTypeText = (value) => {
  const map = {
    all: '全部类型',
    personal: '个人记账',
    business: '生意记账'
  }
  return map[value] || value
}

// 获取年份显示文本
const getYearText = (value) => {
  if (value === 'all') return '全部年份'
  return `${value}年`
}

// ==================== 方法 ====================

// 加载所有记录
const loadAllRecords = async () => {
  loading.value = true
  try {
    // 获取所有业务记录（包括个人记账和生意记账）
    const records = await businessDataService.getAllBusinessRecords()
    allRecords.value = records
    console.log(`加载了 ${allRecords.value.length} 条记录`)
  } catch (error) {
    console.error('加载记录失败:', error)
    allRecords.value = []
  } finally {
    loading.value = false
  }
}

// 重置筛选条件
const resetFilters = () => {
  filterType.value = 'all'
  filterBusinessType.value = 'all'
  filterYear.value = 'all'
}

// 获取某年度的收支统计
const getYearStats = (records) => {
  let income = 0
  let expense = 0
  records.forEach(record => {
    const amount = parseFloat(record.amount) || 0
    if (record.type === '收入') {
      income += amount
    } else {
      expense += amount
    }
  })
  return { income, expense }
}

// 切换年份组的折叠状态
const toggleYearGroup = (year) => {
  expandedYears[year] = !expandedYears[year]
}

// 切换记录展开/折叠
const toggleRecordExpand = (recordId) => {
  expandedRecordId.value = expandedRecordId.value === recordId ? null : recordId
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

// 格式化日期（月-日）
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${month}-${day}`
}

// 格式化完整日期
const formatFullDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}.${month}.${day}`
}

// 格式化数字
const formatNumber = (num) => {
  if (num === undefined || num === null) return '0.00'
  return parseFloat(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ==================== 监听 ====================
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 重置状态
    expandedRecordId.value = null
    resetFilters()
    // 清空折叠状态
    Object.keys(expandedYears).forEach(key => {
      delete expandedYears[key]
    })
    // 加载数据
    loadAllRecords()
  }
})

// 初始化
onMounted(() => {
  if (props.visible) {
    loadAllRecords()
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
  max-width: 600px;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-height: 80vh;
  overflow-y: auto;
}

.history-modal {
  width: 95%;
  max-width: 800px;
}

.modal-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--primary-color);
  position: sticky;
  top: 0;
  background-color: var(--white);
  z-index: 10;
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
  max-height: calc(80vh - 180px);
  overflow-y: auto;
  padding-right: 5px;
}

.modal-footer {
  display: flex;
  justify-content: center;
  padding-top: 15px;
  border-top: 1px solid var(--primary-color);
  position: sticky;
  bottom: 0;
  background-color: var(--white);
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

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  padding: 10px;
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 12px;
}

.filter-group {
  flex: 1;
  min-width: 100px;
}

/* 自定义选择器样式 */
.filter-select-custom {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--secondary-color);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-dark);
  background-color: var(--white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s;
}

.filter-select-custom:hover {
  border-color: var(--accent-color);
  background-color: rgba(213, 235, 225, 0.1);
}

.filter-select-custom i {
  font-size: 12px;
  color: var(--tertiary-color);
}

.filter-reset {
  padding: 8px 12px;
  background-color: var(--primary-color);
  border: none;
  border-radius: 8px;
  color: var(--accent-color);
  cursor: pointer;
  transition: all 0.3s;
}

.filter-reset:hover {
  background-color: var(--secondary-color);
}

/* 统计摘要 */
.history-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: rgba(213, 235, 225, 0.2);
  border-radius: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background-color: var(--white);
  border-radius: 10px;
  box-shadow: 0 2px 5px var(--shadow);
}

.stat-label {
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 5px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
}

/* 记录列表样式 */
.records-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.year-group {
  margin-bottom: 5px;
  border-radius: 12px;
  overflow: hidden;
  background-color: rgba(213, 235, 225, 0.1);
}

.year-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  background-color: var(--primary-color);
  color: var(--accent-color);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 12px;
}

.year-header:hover {
  background-color: var(--secondary-color);
}

.year-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.year-header-left i {
  font-size: 18px;
}

.year-count {
  font-size: 12px;
  color: var(--text-light);
  background-color: var(--white);
  padding: 2px 10px;
  border-radius: 20px;
  margin-left: 5px;
}

.year-header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.year-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 8px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  font-size: 12px;
}

.stat-row .stat-label {
  color: var(--text-dark);
  font-weight: 500;
}

.stat-row .stat-value {
  font-weight: 600;
}

.income-row .stat-value {
  color: #2ecc71;
}

.expense-row .stat-value {
  color: #e74c3c;
}

.year-header-right .expand-icon {
  font-size: 14px;
  color: var(--accent-color);
  transition: transform 0.3s;
}

.year-records {
  padding: 10px;
  background-color: var(--white);
}

.record-item {
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 12px;
  border-left: 4px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
  overflow: hidden;
  margin-bottom: 8px;
}

.record-item:hover {
  background-color: rgba(213, 235, 225, 0.2);
}

.record-income {
  border-left-color: #2ecc71;
}

.record-expense {
  border-left-color: #e74c3c;
}

.record-summary {
  display: flex;
  align-items: center;
  padding: 12px;
}

.record-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 18px;
}

.record-income .record-icon {
  background-color: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.record-expense .record-icon {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.record-info {
  flex: 1;
}

.record-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--text-dark);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.record-category {
  font-weight: 600;
}

.business-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  background-color: rgba(243, 156, 18, 0.1);
  color: #f39c12;
}

.personal-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  background-color: rgba(128, 164, 146, 0.1);
  color: #80A492;
}

.record-meta {
  font-size: 11px;
  color: var(--text-light);
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.record-date {
  background-color: var(--primary-color);
  padding: 2px 6px;
  border-radius: 4px;
}

.record-type-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.income-badge {
  background-color: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.expense-badge {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.record-amount {
  font-weight: 600;
  font-size: 16px;
  margin-right: 10px;
  min-width: 100px;
  text-align: right;
}

.expand-icon {
  color: var(--text-light);
  font-size: 14px;
  width: 20px;
  text-align: center;
}

.record-detail {
  padding: 15px;
  background-color: rgba(255, 255, 255, 0.5);
  border-top: 1px dashed var(--secondary-color);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  grid-column: span 2;
}

.detail-label {
  font-size: 12px;
  color: var(--text-light);
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-dark);
}

.income-text {
  color: #2ecc71;
}

.expense-text {
  color: #e74c3c;
}

.note-text {
  background-color: rgba(128, 164, 146, 0.1);
  padding: 8px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
}

.empty-records {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-light);
}

.empty-records i {
  font-size: 48px;
  margin-bottom: 15px;
  color: var(--tertiary-color);
}

.empty-records p {
  font-size: 14px;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-light);
}

.loading-state i {
  font-size: 40px;
  color: var(--accent-color);
  margin-bottom: 10px;
}

/* 动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 响应式 */
@media (max-width: 600px) {
  .filter-bar {
    flex-direction: column;
  }

  .year-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .year-header-right {
    width: 100%;
    justify-content: space-between;
  }

  .year-stats {
    min-width: 100px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-item.full-width {
    grid-column: span 1;
  }

  .record-summary {
    flex-wrap: wrap;
  }

  .record-amount {
    margin-left: 52px;
    margin-top: 8px;
    text-align: left;
  }
}
</style>