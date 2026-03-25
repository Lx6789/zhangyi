<template>
  <div class="home">
    <!-- 顶部工具栏（可选） -->
    <div class="toolbar">
      <button class="refresh-btn" @click="handleManualRefresh" title="刷新数据">
        <i class="fas fa-sync-alt"></i>
      </button>
      <button class="data-transfer-btn" @click="openDataTransferModal" title="数据迁移">
        <i class="fas fa-exchange-alt"></i>
      </button>
    </div>

    <!-- 总收支情况 -->
    <section class="total-summary">
      <div class="section-title">
        <h2>总收支情况</h2>
        <i class="fas fa-chart-pie"></i>
      </div>

      <!-- 总计 -->
      <div class="total-card">
        <div class="total-label">累计结余</div>
        <div class="total-amount">¥ {{ formatNumber(totalBalance) }}</div>
      </div>

      <div class="income-expense">
        <div class="income-box">
          <div class="amount income-amount">{{ totalIncome }}</div>
          <div class="label">总收入</div>
        </div>
        <div class="expense-box">
          <div class="amount expense-amount">{{ totalExpense }}</div>
          <div class="label">总支出</div>
        </div>
      </div>
    </section>

    <!-- 今日收支情况 -->
    <section class="today-summary">
      <div class="section-title">
        <h2>今日收支情况</h2>
        <i class="fas fa-calendar-day"></i>
      </div>

      <!-- 今日总计 -->
      <div class="today-total">
        <div class="total-label">今日结余</div>
        <div class="total-amount">¥ {{ formatNumber(todayTotal) }}</div>
      </div>

      <div class="income-expense">
        <div class="income-box">
          <div class="amount income-amount">{{ todayIncome }}</div>
          <div class="label">收入</div>
        </div>
        <div class="expense-box">
          <div class="amount expense-amount">{{ todayExpense }}</div>
          <div class="label">支出</div>
        </div>
      </div>

      <button class="record-btn" @click="openRecordModal">
        <i class="fas fa-plus-circle"></i> 记一笔
      </button>
    </section>

    <!-- 历史收支查询 -->
    <section class="history-summary">
      <div class="section-title">
        <h2>历史收支查询</h2>
        <i class="fas fa-history"></i>
      </div>

      <div class="record-type-filter">
        <button
            class="type-filter-btn"
            :class="{ active: selectedRecordType === 'all' }"
            @click="selectedRecordType = 'all'"
        >
          全部
        </button>
        <button
            class="type-filter-btn"
            :class="{ active: selectedRecordType === 'personal' }"
            @click="selectedRecordType = 'personal'"
        >
          个人记账
        </button>
        <button
            class="type-filter-btn"
            :class="{ active: selectedRecordType === 'business' }"
            @click="selectedRecordType = 'business'"
        >
          生意记账
        </button>
      </div>

      <!-- 时间筛选器 -->
      <div class="time-filter">
        <div class="filter-tabs">
          <button
              v-for="filter in timeFilters"
              :key="filter.value"
              class="filter-btn"
              :class="{ active: selectedTimeFilter === filter.value }"
              @click="selectTimeFilter(filter.value)"
          >
            {{ filter.label }}
          </button>
        </div>

        <!-- 年份选择器 -->
        <div v-show="selectedTimeFilter === 'year'" class="year-selector">
          <button class="year-nav" @click="changeYear(-1)">
            <i class="fas fa-chevron-left"></i>
          </button>
          <span class="current-year">{{ selectedYear }}年</span>
          <button class="year-nav" @click="changeYear(1)">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>

        <!-- 月份选择器 -->
        <div v-show="selectedTimeFilter === 'month'" class="month-selector">
          <button class="month-nav" @click="changeMonth(-1)">
            <i class="fas fa-chevron-left"></i>
          </button>
          <span class="current-month">{{ selectedYear }}年{{ selectedMonth }}月</span>
          <button class="month-nav" @click="changeMonth(1)">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>

        <!-- 周选择器 -->
        <div v-show="selectedTimeFilter === 'week'" class="week-selector">
          <button class="week-nav" @click="changeWeek(-1)">
            <i class="fas fa-chevron-left"></i>
          </button>
          <span class="current-week">{{ getWeekRangeText(selectedWeekOffset) }}</span>
          <button class="week-nav" @click="changeWeek(1)">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>

        <!-- 日期选择器 -->
        <div v-show="selectedTimeFilter === 'date'" class="date-selector">
          <input type="date" v-model="selectedDate" class="date-input" @change="loadHistoryData">
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>加载中...</p>
      </div>

      <!-- 筛选结果统计 -->
      <div v-else class="filter-stats">
        <div class="stats-card">
          <div class="stats-label">{{ getStatsTitle() }}总收入</div>
          <div class="stats-amount income-amount">{{ formatHistoryIncome }}</div>
        </div>
        <div class="stats-card">
          <div class="stats-label">{{ getStatsTitle() }}总支出</div>
          <div class="stats-amount expense-amount">{{ formatHistoryExpense }}</div>
        </div>
        <div class="stats-card">
          <div class="stats-label">{{ getStatsTitle() }}结余</div>
          <div class="stats-amount" :class="historyBalance >= 0 ? 'income-amount' : 'expense-amount'">
            {{ formatHistoryBalance }}
          </div>
        </div>
      </div>

      <!-- 收支明细列表 -->
      <div class="history-records">
        <div class="section-subtitle">
          <h3>{{ getRecordsTitle() }}</h3>
          <span class="record-count">共 {{ filteredRecords.length }} 笔</span>
        </div>

        <div v-if="filteredRecords.length === 0" class="empty-records">
          <i class="fas fa-receipt"></i>
          <p>该时间段暂无收支记录</p>
        </div>

        <div v-else class="records-list hide-scrollbar">
          <div v-for="record in filteredRecords" :key="record.id" class="record-item"
               :class="record.type === '收入' ? 'record-income' : 'record-expense'">
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
                <span class="record-source" v-if="record.type === '收入' && record.source">{{ record.source }}</span>
                <span class="record-supplier" v-if="record.type === '支出' && record.supplier && record.supplier !== '无'">{{ record.supplier }}</span>
              </div>
            </div>
            <div class="record-amount">
              <span :class="record.type === '收入' ? 'income-amount' : 'expense-amount'">
                {{ record.type === '收入' ? '+' : '-' }}¥ {{ formatNumber(record.amount) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 记账模态框 -->
    <div class="modal" :class="{ active: recordModalVisible }" @click="closeModalOnOverlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <i class="fas" :class="recordType === '收入' ? 'fa-money-bill-wave' : 'fa-receipt'"></i>
          <h3>{{ recordType === '收入' ? '收入记账' : '支出记账' }}</h3>
          <button class="modal-close" @click="recordModalVisible = false">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- 收入/支出切换 -->
        <div class="record-type-switch">
          <button
              class="tab-btn"
              :class="{ active: recordType === '收入' }"
              @click="recordType = '收入'"
          >
            <i class="fas fa-money-bill-wave"></i> 收入
          </button>
          <button
              class="tab-btn"
              :class="{ active: recordType === '支出' }"
              @click="recordType = '支出'"
          >
            <i class="fas fa-receipt"></i> 支出
          </button>
        </div>

        <form @submit.prevent="submitRecord">
          <!-- 收入表单 -->
          <div v-if="recordType === '收入'">
            <div class="form-group">
              <label><i class="fas fa-tag"></i> 收入类型</label>
              <div class="select-with-actions">
                <select v-model="incomeForm.category" class="form-select" required>
                  <option value="">选择收入类型</option>
                  <option v-for="category in incomeCategories" :key="category.id" :value="category.name">
                    {{ category.name }}
                  </option>
                  <option value="__new__">➕ 添加新类型</option>
                </select>
                <div class="select-actions" v-if="incomeForm.category && incomeForm.category !== '__new__'">
                  <button type="button" class="action-btn" @click="editCategory('income', incomeForm.category)" title="编辑">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button type="button" class="action-btn" @click="deleteCategory('income', incomeForm.category)" title="删除">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>

              <div v-if="showIncomeCategoryForm" class="edit-form">
                <input
                    v-model="categoryForm.name"
                    type="text"
                    class="form-input"
                    :placeholder="categoryForm.isEdit ? '修改类型名称' : '输入新收入类型'"
                    @keyup.enter="saveCategory('income')"
                >
                <div class="edit-form-actions">
                  <button type="button" class="btn btn-small btn-secondary" @click="cancelCategoryForm('income')">取消</button>
                  <button type="button" class="btn btn-small btn-primary" @click="saveCategory('income')">保存</button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label><i class="fas fa-store"></i> 收入来源</label>
              <div class="select-with-actions">
                <select v-model="incomeForm.source" class="form-select" required>
                  <option value="">选择收入来源</option>
                  <option v-for="source in incomeSources" :key="source.id" :value="source.name">
                    {{ source.name }}
                  </option>
                  <option value="__new__">➕ 添加新来源</option>
                </select>
                <div class="select-actions" v-if="incomeForm.source && incomeForm.source !== '__new__'">
                  <button type="button" class="action-btn" @click="editSource(incomeForm.source)" title="编辑">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button type="button" class="action-btn" @click="deleteSource(incomeForm.source)" title="删除">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>

              <div v-if="showIncomeSourceForm" class="edit-form">
                <input
                    v-model="sourceForm.name"
                    type="text"
                    class="form-input"
                    :placeholder="sourceForm.isEdit ? '修改来源名称' : '输入新收入来源'"
                    @keyup.enter="saveSource"
                >
                <div class="edit-form-actions">
                  <button type="button" class="btn btn-small btn-secondary" @click="cancelSourceForm">取消</button>
                  <button type="button" class="btn btn-small btn-primary" @click="saveSource">保存</button>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label><i class="fas fa-yen-sign"></i> 金额 (元)</label>
                <input v-model="incomeForm.amount" type="number" class="form-input" placeholder="例如：1000" min="0.01" step="0.01" required>
              </div>

              <div class="form-group">
                <label><i class="fas fa-calendar-alt"></i> 日期</label>
                <input v-model="incomeForm.date" type="date" class="form-input" required>
              </div>
            </div>

            <div class="form-group">
              <label><i class="fas fa-wallet"></i> 收款方式</label>
              <div class="category-tags">
                <div
                    v-for="method in paymentMethods"
                    :key="method"
                    class="category-tag"
                    :class="{ active: incomeForm.paymentMethod === method }"
                    @click="incomeForm.paymentMethod = method"
                >
                  {{ method }}
                </div>
              </div>
            </div>

            <div class="form-group">
              <label><i class="fas fa-comment"></i> 备注 (可选)</label>
              <textarea v-model="incomeForm.note" class="form-input form-textarea" placeholder="记录更多细节..."></textarea>
            </div>
          </div>

          <!-- 支出表单 -->
          <div v-else>
            <div class="form-group">
              <label><i class="fas fa-list"></i> 支出类型</label>
              <div class="select-with-actions">
                <select v-model="expenseForm.category" class="form-select" @change="updateExpenseSubtypes" required>
                  <option value="">选择支出类型</option>
                  <option v-for="category in expenseCategories" :key="category.id" :value="category.name">
                    {{ category.name }}
                  </option>
                  <option value="__new__">➕ 添加新类型</option>
                </select>
                <div class="select-actions" v-if="expenseForm.category && expenseForm.category !== '__new__'">
                  <button type="button" class="action-btn" @click="editCategory('expense', expenseForm.category)" title="编辑">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button type="button" class="action-btn" @click="deleteCategory('expense', expenseForm.category)" title="删除">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>

              <div v-if="showExpenseCategoryForm" class="edit-form">
                <input
                    v-model="categoryForm.name"
                    type="text"
                    class="form-input"
                    :placeholder="categoryForm.isEdit ? '修改类型名称' : '输入新支出类型'"
                    @keyup.enter="saveCategory('expense')"
                >
                <div class="edit-form-actions">
                  <button type="button" class="btn btn-small btn-secondary" @click="cancelCategoryForm('expense')">取消</button>
                  <button type="button" class="btn btn-small btn-primary" @click="saveCategory('expense')">保存</button>
                </div>
              </div>
            </div>

            <div class="form-group" v-if="expenseForm.category && expenseForm.category !== '__new__'">
              <label><i class="fas fa-tag"></i> 具体项目</label>
              <div class="select-with-actions">
                <select v-model="expenseForm.subtype" class="form-select" required>
                  <option value="">选择具体项目</option>
                  <option v-for="subtype in getExpenseSubtypes(expenseForm.category)" :key="subtype.id" :value="subtype.name">
                    {{ subtype.name }}
                  </option>
                  <option value="__new_sub__">➕ 添加新项目</option>
                </select>
                <div class="select-actions" v-if="expenseForm.subtype && expenseForm.subtype !== '__new_sub__'">
                  <button type="button" class="action-btn" @click="editSubtype(expenseForm.category, expenseForm.subtype)" title="编辑">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button type="button" class="action-btn" @click="deleteSubtype(expenseForm.category, expenseForm.subtype)" title="删除">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>

              <div v-if="showSubtypeForm" class="edit-form">
                <input
                    v-model="subtypeForm.name"
                    type="text"
                    class="form-input"
                    :placeholder="subtypeForm.isEdit ? '修改项目名称' : '输入新项目'"
                    @keyup.enter="saveSubtype"
                >
                <div class="edit-form-actions">
                  <button type="button" class="btn btn-small btn-secondary" @click="cancelSubtypeForm">取消</button>
                  <button type="button" class="btn btn-small btn-primary" @click="saveSubtype">保存</button>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label><i class="fas fa-yen-sign"></i> 金额 (元)</label>
                <input v-model="expenseForm.amount" type="number" class="form-input" placeholder="例如：500" min="0.01" step="0.01" required>
              </div>

              <div class="form-group">
                <label><i class="fas fa-calendar-alt"></i> 日期</label>
                <input v-model="expenseForm.date" type="date" class="form-input" required>
              </div>
            </div>

            <div class="form-group">
              <label><i class="fas fa-user"></i> 供应商/收款人 (可选)</label>
              <input v-model="expenseForm.supplier" type="text" class="form-input" placeholder="例如：农资店张老板">
            </div>

            <div class="form-group">
              <label><i class="fas fa-comment"></i> 备注 (可选)</label>
              <textarea v-model="expenseForm.note" class="form-input form-textarea" placeholder="记录更多细节..."></textarea>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="recordModalVisible = false">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-check"></i> 保存记录
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 数据迁移弹窗 -->
    <DataTransferModal
        :visible="dataTransferVisible"
        @update:visible="dataTransferVisible = $event"
        @data-imported="onDataImported"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authHelperService, notificationService } from '@/services/index.js'
import userDataService from '@/services/user-data.service.js'
import businessDataService from '@/services/cache/business-cache.service.js'
import indexedDBService from '@/services/db/indexed-db.service.js'
import dateHelper from '@/services/utils/date-helper.service.js'
import idGenerator from '@/services/id-generator.service.js'
import DataTransferModal from '@/components/sidebar/DataTransferModal.vue'

const router = useRouter()

// 加载状态
const loading = ref(false)

// 模态框状态
const recordModalVisible = ref(false)
const recordType = ref('收入')

// 数据迁移弹窗状态
const dataTransferVisible = ref(false)

// 收入表单
const incomeForm = reactive({
  category: '',
  source: '',
  amount: '',
  date: '',
  paymentMethod: '现金',
  note: ''
})

// 支出表单
const expenseForm = reactive({
  category: '',
  subtype: '',
  amount: '',
  date: '',
  supplier: '',
  note: ''
})

// 支出子类型列表（用于显示）
const expenseSubtypesList = ref([])

// 收入类型管理
const incomeCategories = ref([])

// 收入来源管理
const incomeSources = ref([])

// 支出类型管理
const expenseCategories = ref([])

// 收款方式
const paymentMethods = ['现金', '微信', '支付宝', '银行卡']

// ==================== 时间筛选状态 ====================
const timeFilters = [
  {value: 'year', label: '年'},
  {value: 'month', label: '月'},
  {value: 'week', label: '周'},
  {value: 'date', label: '日'}
]
const selectedTimeFilter = ref('week')

// 日期选择
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)
const selectedDate = ref(dateHelper.getTodayString())
const selectedWeekOffset = ref(0)

// ==================== 实时数据 ====================
const totalIncome = ref('¥ 0.00')
const totalExpense = ref('¥ 0.00')
const todayIncome = ref('¥ 0.00')
const todayExpense = ref('¥ 0.00')

// 所有记录
const allRecords = ref([])

// 筛选后的记录列表
const filteredRecords = ref([])
const historyIncome = ref(0)
const historyExpense = ref(0)

// 记录类型筛选
const selectedRecordType = ref('all')

// 计算总收支结余
const totalBalance = computed(() => {
  const income = parseFloat(totalIncome.value.replace('¥ ', '').replace(/,/g, ''))
  const expense = parseFloat(totalExpense.value.replace('¥ ', '').replace(/,/g, ''))
  return (income - expense).toFixed(2)
})

// 计算今日结余
const todayTotal = computed(() => {
  const income = parseFloat(todayIncome.value.replace('¥ ', '').replace(/,/g, ''))
  const expense = parseFloat(todayExpense.value.replace('¥ ', '').replace(/,/g, ''))
  return (income - expense).toFixed(2)
})

// 格式化历史收入
const formatHistoryIncome = computed(() => {
  return '¥ ' + historyIncome.value.toFixed(2)
})

// 格式化历史支出
const formatHistoryExpense = computed(() => {
  return '¥ ' + historyExpense.value.toFixed(2)
})

// 计算历史结余
const historyBalance = computed(() => {
  return historyIncome.value - historyExpense.value
})

// 格式化历史结余
const formatHistoryBalance = computed(() => {
  return '¥ ' + historyBalance.value.toFixed(2)
})

// ==================== 表单状态管理 ====================
const showIncomeCategoryForm = ref(false)
const showExpenseCategoryForm = ref(false)
const showIncomeSourceForm = ref(false)
const showSubtypeForm = ref(false)

const categoryForm = ref({
  name: '',
  originalName: '',
  isEdit: false
})

const sourceForm = ref({
  name: '',
  originalName: '',
  isEdit: false
})

const subtypeForm = ref({
  name: '',
  originalName: '',
  categoryName: '',
  isEdit: false
})

// ==================== 数据查询函数 ====================

/**
 * 从 IndexedDB 获取所有记账记录
 */
const getAllRecords = async () => {
  try {
    // 确保数据库已初始化
    await indexedDBService.ensureInitialized()

    console.log('开始获取所有业务记录...')

    // 分别从三个表获取数据
    const [dailyRecords, incomeRecords, expenseRecords] = await Promise.all([
      businessDataService.getDailyRecords(),
      businessDataService.getIncomeRecords(),
      businessDataService.getExpenseRecords()
    ])

    // 合并所有记录
    const allRecords = [...dailyRecords, ...incomeRecords, ...expenseRecords]

    console.log('获取记录完成:', {
      daily: dailyRecords.length,
      income: incomeRecords.length,
      expense: expenseRecords.length,
      total: allRecords.length
    })

    return allRecords
  } catch (error) {
    console.error('获取记录失败:', error)

    // 如果失败，尝试重新初始化数据库
    try {
      console.log('尝试重新初始化数据库...')
      await indexedDBService.init()
      await businessDataService.init(businessDataService.getCurrentUserId())

      const [dailyRecords, incomeRecords, expenseRecords] = await Promise.all([
        businessDataService.getDailyRecords(),
        businessDataService.getIncomeRecords(),
        businessDataService.getExpenseRecords()
      ])

      const allRecords = [...dailyRecords, ...incomeRecords, ...expenseRecords]
      console.log('重新获取成功，记录数:', allRecords.length)
      return allRecords
    } catch (retryError) {
      console.error('重新获取仍然失败:', retryError)
      return []
    }
  }
}

/**
 * 获取总收支数据
 */
const getTotalData = async () => {
  const records = await getAllRecords()

  let totalIncomeAmount = 0
  let totalExpenseAmount = 0

  records.forEach(record => {
    const amount = parseFloat(record.amount) || 0
    if (record.type === '收入') {
      totalIncomeAmount += amount
    } else if (record.type === '支出') {
      totalExpenseAmount += amount
    }
  })

  console.log('总收支统计:', {
    总收入: totalIncomeAmount,
    总支出: totalExpenseAmount,
    记录总数: records.length
  })

  totalIncome.value = '¥ ' + totalIncomeAmount.toFixed(2)
  totalExpense.value = '¥ ' + totalExpenseAmount.toFixed(2)

  return { income: totalIncomeAmount, expense: totalExpenseAmount }
}

/**
 * 获取今日的收支数据
 */
const getTodayData = async () => {
  const records = await getAllRecords()
  const today = dateHelper.getTodayString()

  let todayIncomeTotal = 0
  let todayExpenseTotal = 0

  records.forEach(record => {
    const recordDate = record.date
    if (recordDate === today) {
      const amount = parseFloat(record.amount) || 0
      if (record.type === '收入') {
        todayIncomeTotal += amount
      } else if (record.type === '支出') {
        todayExpenseTotal += amount
      }
    }
  })

  console.log('今日收支统计:', {
    日期: today,
    今日收入: todayIncomeTotal,
    今日支出: todayExpenseTotal
  })

  todayIncome.value = '¥ ' + todayIncomeTotal.toFixed(2)
  todayExpense.value = '¥ ' + todayExpenseTotal.toFixed(2)

  return { income: todayIncomeTotal, expense: todayExpenseTotal }
}

/**
 * 获取指定偏移量的周范围文本
 */
const getWeekRangeText = (offset = 0) => {
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + (offset * 7))
  return dateHelper.getWeekRangeText(baseDate)
}

/**
 * 根据筛选条件加载历史数据
 */
const loadHistoryData = async () => {
  loading.value = true
  try {
    const records = await getAllRecords()

    // 根据类型筛选
    let typeFiltered = records
    if (selectedRecordType.value === 'personal') {
      typeFiltered = records.filter(r => r.businessType === 'personal')
    } else if (selectedRecordType.value === 'business') {
      typeFiltered = records.filter(r => r.businessType === 'business')
    }

    let filtered = []

    if (selectedTimeFilter.value === 'week') {
      // 根据周偏移量计算日期范围
      const baseDate = new Date()
      baseDate.setDate(baseDate.getDate() + (selectedWeekOffset.value * 7))
      const { startDate, endDate } = dateHelper.getWeekRange(baseDate)

      filtered = typeFiltered.filter(record => {
        return record.date >= startDate && record.date <= endDate
      })
    } else {
      const filter = {
        type: selectedTimeFilter.value,
        year: selectedYear.value,
        month: selectedMonth.value,
        date: selectedDate.value
      }
      filtered = dateHelper.filterRecordsByDate(typeFiltered, filter)
    }

    const stats = dateHelper.calculateStats(filtered)

    // 按日期倒序排列
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date))

    filteredRecords.value = filtered
    historyIncome.value = stats.totalIncome
    historyExpense.value = stats.totalExpense

    console.log('历史数据加载完成:', {
      筛选类型: selectedRecordType.value,
      时间筛选: selectedTimeFilter.value,
      记录数: filtered.length,
      总收入: stats.totalIncome,
      总支出: stats.totalExpense
    })
  } catch (error) {
    console.error('加载历史数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听类型变化
watch(selectedRecordType, () => {
  loadHistoryData()
})

/**
 * 刷新所有数据
 */
const refreshData = async () => {
  console.log('开始刷新数据...')
  await getTotalData()
  await getTodayData()
  await loadHistoryData()
  console.log('数据刷新完成')
}

/**
 * 获取统计标题
 */
const getStatsTitle = () => {
  switch (selectedTimeFilter.value) {
    case 'week':
      const baseDate = new Date()
      baseDate.setDate(baseDate.getDate() + (selectedWeekOffset.value * 7))
      const { startDate, endDate } = dateHelper.getWeekRange(baseDate)
      const startParts = startDate.split('-')
      const endParts = endDate.split('-')
      return `${startParts[1]}/${startParts[2]} - ${endParts[1]}/${endParts[2]}`
    case 'month':
      return `${selectedYear.value}年${selectedMonth.value}月`
    case 'year':
      return `${selectedYear.value}年`
    case 'date':
      return selectedDate.value.split('-').slice(1).join('/')
    default:
      return ''
  }
}

/**
 * 获取记录列表标题
 */
const getRecordsTitle = () => {
  return getStatsTitle() + '收支明细'
}

/**
 * 格式化日期显示
 */
const formatDate = (dateStr) => {
  return dateHelper.formatDateShort(dateStr)
}

// ==================== 时间筛选操作 ====================

const selectTimeFilter = (filter) => {
  selectedTimeFilter.value = filter

  // 重置到当前时间
  if (filter === 'week') {
    selectedWeekOffset.value = 0
  } else if (filter === 'month') {
    const now = new Date()
    selectedYear.value = now.getFullYear()
    selectedMonth.value = now.getMonth() + 1
  } else if (filter === 'year') {
    selectedYear.value = new Date().getFullYear()
  } else if (filter === 'date') {
    selectedDate.value = dateHelper.getTodayString()
  }

  loadHistoryData()
}

const changeYear = (delta) => {
  selectedYear.value += delta
  loadHistoryData()
}

const changeMonth = (delta) => {
  selectedMonth.value += delta
  if (selectedMonth.value > 12) {
    selectedMonth.value = 1
    selectedYear.value += 1
  } else if (selectedMonth.value < 1) {
    selectedMonth.value = 12
    selectedYear.value -= 1
  }
  loadHistoryData()
}

const changeWeek = (delta) => {
  selectedWeekOffset.value += delta
  loadHistoryData()
}

// ==================== 监听器 ====================

watch(() => incomeForm.category, (newVal) => {
  if (newVal === '__new__') {
    showIncomeCategoryForm.value = true
    categoryForm.value = {
      name: '',
      originalName: '',
      isEdit: false
    }
    incomeForm.category = ''
  }
})

watch(() => incomeForm.source, (newVal) => {
  if (newVal === '__new__') {
    showIncomeSourceForm.value = true
    sourceForm.value = {
      name: '',
      originalName: '',
      isEdit: false
    }
    incomeForm.source = ''
  }
})

watch(() => expenseForm.category, (newVal) => {
  if (newVal === '__new__') {
    showExpenseCategoryForm.value = true
    categoryForm.value = {
      name: '',
      originalName: '',
      isEdit: false
    }
    expenseForm.category = ''
  } else {
    expenseForm.subtype = ''
  }
})

watch(() => expenseForm.subtype, (newVal) => {
  if (newVal === '__new_sub__') {
    showSubtypeForm.value = true
    subtypeForm.value = {
      name: '',
      originalName: '',
      categoryName: expenseForm.category,
      isEdit: false
    }
    expenseForm.subtype = ''
  }
})

// ==================== 生命周期钩子 ====================

onMounted(async () => {
  console.log('Home组件挂载，检查认证')

  // 只检查token是否存在
  const token = localStorage.getItem('auth_token')
  if (!token) {
    console.log('未检测到token，跳转到登录页')
    router.push({
      path: '/login',
      query: {redirect: router.currentRoute.value.fullPath}
    })
    return
  }

  console.log('认证通过，显示主页')

  // 设置当前用户
  const currentUser = authHelperService.getCurrentUser()
  if (!currentUser) {
    console.error('无法获取当前用户')
    router.push('/login')
    return
  }

  userDataService.setCurrentUser(currentUser)

  // 关键：先初始化业务数据服务，确保 IndexedDB 已经准备好
  console.log('开始初始化业务数据服务...')
  await businessDataService.init(currentUser.id)
  console.log('业务数据服务初始化完成')

  // 验证数据库是否可用
  try {
    const db = await indexedDBService.getDB()
    console.log('数据库连接成功:', db ? '是' : '否')
    console.log('数据库中的表:', db ? Array.from(db.objectStoreNames) : '无')
  } catch (error) {
    console.error('数据库连接失败:', error)
  }

  // 设置默认日期
  const today = new Date()
  const formattedDate = dateHelper.formatDate(today)
  incomeForm.date = formattedDate
  expenseForm.date = formattedDate

  // 从用户数据服务加载配置数据
  loadData()

  // 刷新实时数据
  await refreshData()
})

// ==================== 辅助函数 ====================

/**
 * 获取指定支出类型的子项目
 */
const getExpenseSubtypes = (categoryName) => {
  const category = expenseCategories.value.find(c => c.name === categoryName)
  return category ? category.subtypes : []
}

/**
 * 从用户数据服务加载所有配置数据
 */
const loadData = () => {
  // 加载收入类型
  const savedIncomeCategories = userDataService.getIncomeCategories()
  if (savedIncomeCategories.length > 0) {
    incomeCategories.value = savedIncomeCategories
  } else {
    // 如果没有数据，初始化默认值
    userDataService.initDefaultData()
    incomeCategories.value = userDataService.getIncomeCategories()
  }

  // 加载收入来源
  const savedIncomeSources = userDataService.getIncomeSources()
  if (savedIncomeSources.length > 0) {
    incomeSources.value = savedIncomeSources
  } else {
    incomeSources.value = userDataService.getIncomeSources()
  }

  // 加载支出类型
  const savedExpenseCategories = userDataService.getExpenseCategories()
  if (savedExpenseCategories.length > 0) {
    expenseCategories.value = savedExpenseCategories
  } else {
    expenseCategories.value = userDataService.getExpenseCategories()
  }
}

const saveIncomeCategories = () => {
  userDataService.saveIncomeCategories(incomeCategories.value)
}

const saveIncomeSources = () => {
  userDataService.saveIncomeSources(incomeSources.value)
}

const saveExpenseCategories = () => {
  userDataService.saveExpenseCategories(expenseCategories.value)
}

// ==================== 编辑功能 ====================

const editCategory = (type, categoryName) => {
  if (type === 'income') {
    showIncomeCategoryForm.value = true
    categoryForm.value = {
      name: categoryName,
      originalName: categoryName,
      isEdit: true
    }
  } else {
    showExpenseCategoryForm.value = true
    categoryForm.value = {
      name: categoryName,
      originalName: categoryName,
      isEdit: true
    }
  }
}

const deleteCategory = (type, categoryName) => {
  if (confirm(`确定要删除"${categoryName}"吗？`)) {
    if (type === 'income') {
      const index = incomeCategories.value.findIndex(c => c.name === categoryName)
      if (index !== -1) {
        incomeCategories.value.splice(index, 1)
        saveIncomeCategories()
        if (incomeForm.category === categoryName) {
          incomeForm.category = ''
        }
        notificationService.showNotification(`"${categoryName}"已删除`)
      }
    } else {
      const index = expenseCategories.value.findIndex(c => c.name === categoryName)
      if (index !== -1) {
        expenseCategories.value.splice(index, 1)
        saveExpenseCategories()
        if (expenseForm.category === categoryName) {
          expenseForm.category = ''
        }
        notificationService.showNotification(`"${categoryName}"已删除`)
      }
    }
  }
}

const saveCategory = (type) => {
  if (!categoryForm.value.name.trim()) {
    notificationService.showNotification("请输入名称", "error")
    return
  }

  if (type === 'income') {
    if (categoryForm.value.isEdit) {
      const category = incomeCategories.value.find(c => c.name === categoryForm.value.originalName)
      if (category) {
        category.name = categoryForm.value.name
      }
    } else {
      incomeCategories.value.push({
        id: Date.now(),
        name: categoryForm.value.name
      })
    }
    saveIncomeCategories()
    incomeForm.category = categoryForm.value.name
  } else {
    if (categoryForm.value.isEdit) {
      const category = expenseCategories.value.find(c => c.name === categoryForm.value.originalName)
      if (category) {
        category.name = categoryForm.value.name
      }
    } else {
      expenseCategories.value.push({
        id: Date.now(),
        name: categoryForm.value.name,
        subtypes: []
      })
    }
    saveExpenseCategories()
    expenseForm.category = categoryForm.value.name
  }

  cancelCategoryForm(type)
  notificationService.showNotification(categoryForm.value.isEdit ? '名称已修改' : '新类型已添加')
}

const cancelCategoryForm = (type) => {
  if (type === 'income') {
    showIncomeCategoryForm.value = false
  } else {
    showExpenseCategoryForm.value = false
  }
  categoryForm.value = {
    name: '',
    originalName: '',
    isEdit: false
  }
}

const editSource = (sourceName) => {
  showIncomeSourceForm.value = true
  sourceForm.value = {
    name: sourceName,
    originalName: sourceName,
    isEdit: true
  }
}

const deleteSource = (sourceName) => {
  if (confirm(`确定要删除收入来源"${sourceName}"吗？`)) {
    const index = incomeSources.value.findIndex(s => s.name === sourceName)
    if (index !== -1) {
      incomeSources.value.splice(index, 1)
      saveIncomeSources()
      if (incomeForm.source === sourceName) {
        incomeForm.source = ''
      }
      notificationService.showNotification(`"${sourceName}"已删除`)
    }
  }
}

const saveSource = () => {
  if (!sourceForm.value.name.trim()) {
    notificationService.showNotification("请输入来源名称", "error")
    return
  }

  if (sourceForm.value.isEdit) {
    const source = incomeSources.value.find(s => s.name === sourceForm.value.originalName)
    if (source) {
      source.name = sourceForm.value.name
    }
  } else {
    incomeSources.value.push({
      id: Date.now(),
      name: sourceForm.value.name
    })
  }

  saveIncomeSources()
  incomeForm.source = sourceForm.value.name

  cancelSourceForm()
  notificationService.showNotification(sourceForm.value.isEdit ? '来源名称已修改' : '新来源已添加')
}

const cancelSourceForm = () => {
  showIncomeSourceForm.value = false
  sourceForm.value = {
    name: '',
    originalName: '',
    isEdit: false
  }
}

const editSubtype = (categoryName, subtypeName) => {
  showSubtypeForm.value = true
  subtypeForm.value = {
    name: subtypeName,
    originalName: subtypeName,
    categoryName: categoryName,
    isEdit: true
  }
}

const deleteSubtype = (categoryName, subtypeName) => {
  if (confirm(`确定要删除"${subtypeName}"吗？`)) {
    const category = expenseCategories.value.find(c => c.name === categoryName)
    if (category) {
      const index = category.subtypes.findIndex(s => s.name === subtypeName)
      if (index !== -1) {
        category.subtypes.splice(index, 1)
        saveExpenseCategories()
        if (expenseForm.subtype === subtypeName) {
          expenseForm.subtype = ''
        }
        notificationService.showNotification(`"${subtypeName}"已删除`)
      }
    }
  }
}

const saveSubtype = () => {
  if (!subtypeForm.value.name.trim()) {
    notificationService.showNotification('请输入项目名称', 'error')
    return
  }

  const category = expenseCategories.value.find(c => c.name === subtypeForm.value.categoryName)
  if (!category) return

  if (subtypeForm.value.isEdit) {
    const subtype = category.subtypes.find(s => s.name === subtypeForm.value.originalName)
    if (subtype) {
      subtype.name = subtypeForm.value.name
    }
  } else {
    category.subtypes.push({
      id: Date.now(),
      name: subtypeForm.value.name
    })
  }

  saveExpenseCategories()
  expenseForm.subtype = subtypeForm.value.name

  cancelSubtypeForm()
  notificationService.showNotification(subtypeForm.value.isEdit ? '项目名称已修改' : '新项目已添加')
}

const cancelSubtypeForm = () => {
  showSubtypeForm.value = false
  subtypeForm.value = {
    name: '',
    originalName: '',
    categoryName: '',
    isEdit: false
  }
}

const updateExpenseSubtypes = () => {
  if (expenseForm.category && expenseForm.category !== '__new__') {
    const category = expenseCategories.value.find(c => c.name === expenseForm.category)
    if (category) {
      expenseSubtypesList.value = category.subtypes.map(s => s.name)
    }
  } else {
    expenseSubtypesList.value = []
  }
}

// ==================== 记账功能 ====================

const openRecordModal = () => {
  recordModalVisible.value = true
  resetForms()
}

const resetForms = () => {
  const today = dateHelper.getTodayString()

  incomeForm.category = ''
  incomeForm.source = ''
  incomeForm.amount = ''
  incomeForm.date = today
  incomeForm.paymentMethod = '现金'
  incomeForm.note = ''

  expenseForm.category = ''
  expenseForm.subtype = ''
  expenseForm.amount = ''
  expenseForm.date = today
  expenseForm.supplier = ''
  expenseForm.note = ''
  expenseSubtypesList.value = []

  showIncomeCategoryForm.value = false
  showExpenseCategoryForm.value = false
  showIncomeSourceForm.value = false
  showSubtypeForm.value = false
}

const closeModalOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    recordModalVisible.value = false
  }
}

const submitRecord = async () => {
  let record

  // 获取当前用户ID
  const currentUser = authHelperService.getCurrentUser()
  const userId = currentUser?.id

  if (recordType.value === '收入') {
    if (!incomeForm.category || !incomeForm.source || !incomeForm.amount || !incomeForm.date) {
      notificationService.showNotification("请填写所有必填项！", "error")
      return
    }

    const recordId = idGenerator.generateDailyRecordId(userId)

    record = {
      id: recordId,
      type: '收入',
      category: incomeForm.category,
      source: incomeForm.source,
      amount: parseFloat(incomeForm.amount),
      date: incomeForm.date,
      paymentMethod: incomeForm.paymentMethod,
      note: incomeForm.note,
      businessType: 'personal',
      timestamp: new Date().toISOString(),
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      userId: userId
    }

    await businessDataService.addDailyRecord(record)
  } else {
    if (!expenseForm.category || !expenseForm.subtype || !expenseForm.amount || !expenseForm.date) {
      notificationService.showNotification("请填写所有必填项！", "error")
      return
    }

    const recordId = idGenerator.generateDailyRecordId(userId)

    record = {
      id: recordId,
      type: '支出',
      category: expenseForm.category,
      subtype: expenseForm.subtype,
      amount: parseFloat(expenseForm.amount),
      date: expenseForm.date,
      supplier: expenseForm.supplier || '无',
      note: expenseForm.note,
      businessType: 'personal',
      timestamp: new Date().toISOString(),
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      userId: userId
    }

    await businessDataService.addDailyRecord(record)
  }

  console.log('保存记录成功:', record)
  await refreshData()
  notificationService.showNotification(`${recordType.value}记录成功：¥${record.amount.toFixed(2)}`)
  recordModalVisible.value = false
}

const formatNumber = (num) => {
  return parseFloat(num).toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})
}

// ==================== 数据迁移相关 ====================

/**
 * 打开数据迁移弹窗
 */
const openDataTransferModal = () => {
  dataTransferVisible.value = true
}

/**
 * 数据导入成功后的回调
 * 刷新页面数据
 */
const onDataImported = async (result) => {
  console.log('收到数据导入成功通知:', result)

  try {
    // 显示加载提示
    notificationService.showNotification('数据导入成功，正在刷新页面...', 'info')

    // 刷新所有数据
    await refreshData()

    // 可选：重新加载配置数据（如果导入的是配置类数据）
    await loadData()

    // 显示成功提示
    notificationService.showNotification(`数据刷新完成！共导入 ${result.successCount} 条记录`, 'success')

    console.log('数据刷新完成')
  } catch (error) {
    console.error('刷新数据失败:', error)
    notificationService.showNotification('数据刷新失败，请手动刷新页面', 'error')
  }
}

/**
 * 手动刷新数据
 */
const handleManualRefresh = async () => {
  notificationService.showNotification('正在刷新数据...', 'info')
  await refreshData()
  notificationService.showNotification('数据刷新完成', 'success')
}
</script>

<style scoped>
.home {
  --primary-color: #D5EBE1;
  --secondary-color: #B1D5C8;
  --tertiary-color: #99BCAC;
  --accent-color: #80A492;
  --text-dark: #333333;
  --text-light: #666666;
  --gray-bg: #f8f9fa;
  --overlay: rgba(0, 0, 0, 0.5);
  --white: #ffffff;
  --shadow: rgba(0, 0, 0, 0.1);
  --income-color: #2ecc71;
  --expense-color: #e74c3c;
  padding: 0;
  max-width: 100%;
  position: relative;
}

/* 顶部工具栏 */
.toolbar {
  position: fixed;
  bottom: 80px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
}

.refresh-btn,
.data-transfer-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: var(--primary-color);
  border: none;
  color: var(--accent-color);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.refresh-btn:hover,
.data-transfer-btn:hover {
  background-color: var(--accent-color);
  color: white;
  transform: scale(1.05);
}

.refresh-btn:active {
  transform: scale(0.95);
}

/* 总收支情况 */
.total-summary {
  background-color: var(--white);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
  margin-top: 20px;
  box-shadow: 0 5px 15px var(--shadow);
}

/* 总收支卡片 */
.total-card {
  text-align: center;
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  border-radius: 15px;
}

.total-card .total-label {
  font-size: 14px;
  color: white;
  margin-bottom: 5px;
}

.total-card .total-amount {
  font-size: 32px;
  font-weight: 700;
  color: white;
}

/* 今日收支情况 */
.today-summary {
  background-color: var(--white);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 5px 15px var(--shadow);
}

/* 历史收支查询 */
.history-summary {
  background-color: var(--white);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 25px;
  box-shadow: 0 5px 15px var(--shadow);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--primary-color);
}

.section-title h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-color);
}

.section-title i {
  color: var(--tertiary-color);
  font-size: 18px;
}

/* 今日总计 */
.today-total {
  text-align: center;
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  border-radius: 15px;
}

.today-total .total-label {
  font-size: 14px;
  color: var(--accent-color);
  margin-bottom: 5px;
}

.today-total .total-amount {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent-color);
}

.income-expense {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.income-box,
.expense-box {
  flex: 1;
  padding: 15px;
  border-radius: 15px;
  text-align: center;
}

.income-box {
  background-color: rgba(46, 204, 113, 0.1);
  margin-right: 10px;
}

.expense-box {
  background-color: rgba(231, 76, 60, 0.1);
  margin-left: 10px;
}

.amount {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 5px;
}

.income-amount {
  color: var(--income-color);
}

.expense-amount {
  color: var(--expense-color);
}

.label {
  font-size: 14px;
  color: var(--text-light);
}

.record-btn {
  width: 100%;
  padding: 15px;
  background-color: var(--primary-color);
  border: none;
  border-radius: 15px;
  color: var(--accent-color);
  font-weight: 600;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.record-btn:hover {
  background-color: var(--secondary-color);
}

/* 时间筛选器 */
.time-filter {
  margin-bottom: 20px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  background-color: #f8f9fa;
  padding: 5px;
  border-radius: 12px;
}

.filter-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: none;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.3s;
}

.filter-btn.active {
  background-color: var(--white);
  color: var(--accent-color);
  font-weight: 500;
  box-shadow: 0 2px 5px var(--shadow);
}

/* 年份/月份选择器 */
.year-selector,
.month-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
  padding: 10px;
  background-color: var(--primary-color);
  border-radius: 12px;
}

.year-nav,
.month-nav {
  width: 36px;
  height: 36px;
  border: none;
  background-color: var(--white);
  border-radius: 50%;
  color: var(--accent-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 2px 5px var(--shadow);
}

.year-nav:hover,
.month-nav:hover {
  background-color: var(--accent-color);
  color: var(--white);
}

.current-year,
.current-month {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-color);
  min-width: 120px;
  text-align: center;
}

/* 日期选择器 */
.date-selector {
  margin-top: 10px;
}

.date-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--secondary-color);
  border-radius: 12px;
  font-size: 16px;
  color: var(--text-dark);
  background-color: rgba(213, 235, 225, 0.1);
}

/* 筛选结果统计 */
.filter-stats {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.stats-card {
  flex: 1;
  padding: 12px;
  background-color: rgba(213, 235, 225, 0.2);
  border-radius: 12px;
  text-align: center;
}

.stats-label {
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 5px;
}

.stats-amount {
  font-size: 16px;
  font-weight: 600;
}

/* 收支明细列表 */
.history-records {
  margin-top: 20px;
  background-color: rgba(213, 235, 225, 0.2);
  border-radius: 15px;
  padding: 15px;
}

.section-subtitle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-subtitle h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-color);
}

.record-count {
  font-size: 12px;
  color: var(--text-light);
  background-color: var(--primary-color);
  padding: 4px 8px;
  border-radius: 12px;
}

.empty-records {
  text-align: center;
  padding: 30px;
  color: var(--text-light);
}

.empty-records i {
  font-size: 40px;
  margin-bottom: 10px;
  color: var(--tertiary-color);
}

.empty-records p {
  font-size: 14px;
}

/* 隐藏滚动条但保留滑动功能的列表 */
.records-list.hide-scrollbar {
  max-height: 300px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.records-list.hide-scrollbar::-webkit-scrollbar {
  display: none;
  width: 0;
  background: transparent;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: var(--white);
  border-radius: 12px;
  margin-bottom: 8px;
  border-left: 4px solid transparent;
  transition: all 0.2s;
}

.record-item:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px var(--shadow);
}

.record-income {
  border-left-color: var(--income-color);
}

.record-expense {
  border-left-color: var(--expense-color);
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
  color: var(--income-color);
}

.record-expense .record-icon {
  background-color: rgba(231, 76, 60, 0.1);
  color: var(--expense-color);
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
}

.record-date {
  background-color: var(--primary-color);
  padding: 2px 6px;
  border-radius: 4px;
}

.record-source,
.record-supplier {
  background-color: rgba(128, 164, 146, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.record-amount {
  font-weight: 600;
  font-size: 16px;
}

/* 周选择器 */
.week-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
  padding: 10px;
  background-color: var(--primary-color);
  border-radius: 12px;
}

.week-nav {
  width: 36px;
  height: 36px;
  border: none;
  background-color: var(--white);
  border-radius: 50%;
  color: var(--accent-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 2px 5px var(--shadow);
}

.week-nav:hover {
  background-color: var(--accent-color);
  color: var(--white);
}

.current-week {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-color);
  min-width: 140px;
  text-align: center;
}

/* 记录类型筛选 */
.record-type-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  padding: 5px;
  background-color: #f8f9fa;
  border-radius: 12px;
}

.type-filter-btn {
  flex: 1;
  padding: 8px;
  border: none;
  background: none;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.3s;
}

.type-filter-btn.active {
  background-color: var(--white);
  color: var(--accent-color);
  font-weight: 500;
  box-shadow: 0 2px 5px var(--shadow);
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 20px;
  color: var(--text-light);
}

.loading-state i {
  font-size: 24px;
  margin-bottom: 10px;
  color: var(--accent-color);
}

.loading-state p {
  font-size: 14px;
}

/* ==================== 记账模态框样式 ==================== */
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

/* 模态框头部 */
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

/* 标签切换按钮 */
.record-type-switch {
  display: flex;
  gap: 10px;
  margin: 20px 25px 0;
}

.tab-btn {
  flex: 1;
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
  gap: 6px;
}

.tab-btn i {
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

/* 表单容器 */
form {
  padding: 0 25px 25px;
  overflow-y: auto;
  max-height: calc(85vh - 180px);
}

/* 表单组 */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #80A492;
  margin-bottom: 8px;
}

.form-group label i {
  margin-right: 8px;
  width: 20px;
  color: #99BCAC;
}

/* 表单输入 */
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

.form-select {
  width: 100%;
  padding: 12px 35px 12px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  color: #333;
  background-color: white;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2380A492' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
}

.form-select:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
}

/* 表单行 */
.form-row {
  display: flex;
  gap: 15px;
}

.form-row .form-group {
  flex: 1;
}

/* 表单按钮 */
.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
  padding-top: 10px;
  border-top: 1px solid #D5EBE1;
}

.btn {
  flex: 1;
  padding: 14px;
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

.btn-primary {
  background-color: #D5EBE1;
  color: #80A492;
}

.btn-primary:hover {
  background-color: #B1D5C8;
}

.btn-secondary {
  background-color: white;
  color: #80A492;
  border: 1px solid #B1D5C8;
}

.btn-secondary:hover {
  background-color: #f8fafc;
  border-color: #80A492;
}

.btn-small {
  padding: 10px;
  font-size: 13px;
  flex: none;
}

/* 分类标签 */
.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 5px;
}

.category-tag {
  padding: 8px 16px;
  background-color: #D5EBE1;
  border-radius: 30px;
  font-size: 13px;
  color: #80A492;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.category-tag:hover {
  background-color: #B1D5C8;
}

.category-tag.active {
  background-color: #80A492;
  color: white;
}

/* 可编辑下拉框 */
.select-with-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.select-actions {
  display: flex;
  gap: 5px;
}

.action-btn {
  width: 42px;
  height: 42px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  background: white;
  color: #80A492;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  flex-shrink: 0;
  font-size: 16px;
}

.action-btn:hover {
  background-color: #D5EBE1;
  border-color: #80A492;
}

/* 编辑表单 */
.edit-form {
  margin-top: 10px;
  padding: 20px;
  background-color: #f8fafc;
  border-radius: 16px;
  border: 1px solid #D5EBE1;
}

.edit-form-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

/* 自定义滚动条 */
.modal-content::-webkit-scrollbar,
form::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track,
form::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb,
form::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb:hover,
form::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}

/* Firefox 滚动条样式 */
.modal-content,
form {
  scrollbar-width: thin;
  scrollbar-color: #B1D5C8 #f1f1f1;
}

/* 响应式调整 - 周选择器 */
@media (max-width: 400px) {
  .week-selector {
    gap: 10px;
  }

  .current-week {
    font-size: 14px;
    min-width: 120px;
  }
}

@media (max-width: 480px) {
  .modal-header {
    padding: 15px 20px;
  }

  .modal-header h3 {
    font-size: 18px;
  }

  .record-type-switch {
    margin: 15px 20px 0;
  }

  form {
    padding: 0 20px 20px;
  }

  .form-row {
    flex-direction: column;
    gap: 10px;
  }

  .form-actions {
    flex-direction: column;
  }

  .select-with-actions {
    flex-direction: column;
  }

  .select-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .action-btn {
    width: 100%;
  }

  /* 工具栏响应式 */
  .toolbar {
    bottom: 70px;
    right: 15px;
  }

  .refresh-btn,
  .data-transfer-btn {
    width: 45px;
    height: 45px;
    font-size: 18px;
  }
}
</style>