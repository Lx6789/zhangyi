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

        <!-- 记录列表（按年份分组，可折叠） -->
        <div v-else-if="allRecords.length === 0" class="empty-records">
          <i class="fas fa-receipt"></i>
          <p>暂无任何收支记录</p>
        </div>

        <div v-else class="records-list">
          <template v-for="(records, year) in groupedRecords" :key="year">
            <div class="year-group">
              <!-- 年份标题（可点击折叠/展开） -->
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

              <!-- 该年的记录列表（根据折叠状态显示/隐藏） -->
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
                          <span class="record-desc" v-if="record.type === '支出' && record.subtype">({{ record.subtype }})</span>
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
                        <div v-if="record.type === '支出' && record.subtype" class="detail-item">
                          <span class="detail-label">项目：</span>
                          <span class="detail-value">{{ record.subtype }}</span>
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
                        <div v-if="record.type === '支出' && record.supplier && record.supplier !== '无'" class="detail-item">
                          <span class="detail-label">供应商：</span>
                          <span class="detail-value">{{ record.supplier }}</span>
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
import { ref, computed, reactive, watch } from 'vue'
import businessDataService from '@/services/business-data.service.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'close'])

const expandedRecordId = ref(null)
const loading = ref(false)
const allRecords = ref([])

// 存储每个年份的折叠状态
const expandedYears = reactive({})

// 加载所有记录
const loadAllRecords = async () => {
  if (!selectedPlan.value?.id) return

  if (isOnline.value) {
    // 在线时尝试从后端获取
    try {
      const params = {
        page: currentPage.value,
        size: pageSize.value
      }

      if (selectedMemberForRecords.value) {
        params.memberId = Number(selectedMemberForRecords.value)
      }

      if (dateRange.startTime) {
        params.startTime = dateRange.startTime
      }
      if (dateRange.endTime) {
        params.endTime = dateRange.endTime
      }

      const response = await savingService.getPlanSavingRecordsByPost(
          Number(selectedPlan.value.id),
          params
      )

      if (response.code === 200) {
        // 处理响应数据
        let records = []
        if (Array.isArray(response.data)) {
          records = response.data
          totalRecords.value = response.total || records.length
        } else if (response.data && response.data.records) {
          records = response.data.records
          totalRecords.value = response.data.total || records.length
        } else {
          records = response.data || []
          totalRecords.value = records.length
        }

        // 缓存记录（增量更新）
        await groupSavingCache.cacheDepositRecords(records, selectedPlan.value.id)

        // 更新显示
        allRecords.value = records
        filterRecords()
      }
    } catch (error) {
      console.warn('获取记录失败，使用缓存数据')
      await loadRecordsFromCache()
    }
  } else {
    // 离线时从缓存获取
    await loadRecordsFromCache()
  }
}

const loadRecordsFromCache = async () => {
  loadingAllRecords.value = true
  try {
    const filters = {
      memberId: selectedMemberForRecords.value || null,
      startTime: dateRange.startTime || null,
      endTime: dateRange.endTime || null
    }

    const records = await groupSavingCache.getCachedDepositRecordsByGroupId(
        selectedPlan.value.id,
        filters
    )

    // 简单分页
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    allRecords.value = records.slice(start, end)
    totalRecords.value = records.length

    filterRecords()
  } catch (error) {
    console.error('从缓存加载记录失败:', error)
    allRecords.value = []
    totalRecords.value = 0
  } finally {
    loadingAllRecords.value = false
  }
}

// 监听弹框显示时加载数据
watch(() => props.visible, (newVal) => {
  if (newVal) {
    expandedRecordId.value = null
    allRecords.value = []
    loadAllRecords()
  }
})

// 计算总统计
const totalStats = computed(() => {
  let totalIncome = 0
  let totalExpense = 0

  allRecords.value.forEach(record => {
    const amount = parseFloat(record.amount)
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
    count: allRecords.value.length
  }
})

// 按年份分组记录
const groupedRecords = computed(() => {
  const groups = {}

  allRecords.value.forEach(record => {
    const year = record.date.split('-')[0]
    if (!groups[year]) {
      groups[year] = []
    }
    groups[year].push(record)
  })

  return Object.keys(groups)
      .sort((a, b) => b - a)
      .reduce((acc, year) => {
        acc[year] = groups[year]
        if (Object.keys(acc).length === 1 && expandedYears[year] === undefined) {
          expandedYears[year] = true
        }
        return acc
      }, {})
})

// 获取某年度的收支统计
const getYearStats = (records) => {
  let income = 0
  let expense = 0
  records.forEach(record => {
    const amount = parseFloat(record.amount)
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
  const date = new Date(dateStr)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${month}-${day}`
}

// 格式化完整日期
const formatFullDate = (dateStr) => {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}.${month}.${day}`
}

// 格式化数字
const formatNumber = (num) => {
  return parseFloat(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--overlay);
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
  max-width: 700px;
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
  max-height: calc(80vh - 150px);
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

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-light);
}

.loading-state i {
  font-size: 40px;
  margin-bottom: 10px;
  color: var(--accent-color);
}

.loading-state p {
  font-size: 14px;
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
}

.record-desc {
  font-size: 12px;
  color: var(--text-light);
  margin-left: 4px;
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

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 480px) {
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
}
</style>