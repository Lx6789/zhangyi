<template>
  <section class="savings-section">
    <div class="section-title">
      <h2>个人存钱计划</h2>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>加载中...</p>
    </div>

    <!-- 计划列表 -->
    <div class="savings-list" v-else-if="personalSavings.length > 0">
      <div
          v-for="plan in personalSavings"
          :key="plan.id"
          class="savings-item"
          :class="getPlanClass(plan)"
      >
        <!-- 右上角操作按钮 -->
        <div class="card-actions">
          <button class="edit-btn" @click.stop="$emit('edit', plan)" title="编辑计划">
            <i class="fas fa-edit"></i>
          </button>
          <button class="delete-btn" @click.stop="$emit('delete', plan)" title="删除计划">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>

        <!-- 卡片主体内容 - 点击显示详情弹窗 -->
        <div class="savings-content" @click="openDetailModal(plan)">
          <div class="savings-icon" :style="{ backgroundColor: plan.color || getColorByType(plan.type) }">
            <i :class="plan.icon || getIconByType(plan.type)"></i>
          </div>
          <div class="savings-info">
            <h3>{{ plan.name }}</h3>
            <p>{{ plan.reason }}</p>
            <div class="savings-amount">
              已存 ¥{{ formatNumber(plan.currentAmount) }} / 目标 ¥{{ formatNumber(plan.targetAmount) }}
            </div>
            <div class="savings-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: (plan.progress || calculateProgress(plan.currentAmount, plan.targetAmount)) + '%' }"></div>
              </div>
              <div class="progress-text">
                <span>{{ plan.type || '日常储蓄' }}</span>
                <span>{{ plan.progress || calculateProgress(plan.currentAmount, plan.targetAmount) }}%</span>
              </div>
            </div>

            <!-- 截止日期 -->
            <div class="deadline-info" v-if="plan.deadline">
              <i class="far fa-calendar-alt"></i>
              <span>截止: {{ formatDate(plan.deadline) }}</span>
            </div>

            <!-- 创建时间 -->
            <div class="create-time-info" v-if="plan.createdAt">
              <i class="far fa-calendar-plus"></i>
              <span>创建: {{ formatDateTime(plan.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 底部操作按钮区域 -->
        <div class="savings-actions">
          <button class="savings-add-btn" @click.stop="openAddMoneyModal(plan)" title="存入金额">
            <i class="fas fa-plus-circle"></i>
            <span>存钱</span>
          </button>

          <div v-if="plan.completed || plan.progress >= 100" class="completed-badge">
            <i class="fas fa-check-circle"></i>
            <span>已完成</span>
          </div>
          <div v-else class="action-placeholder"></div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <i class="fas fa-piggy-bank"></i>
      <h3>暂无个人存钱计划</h3>
      <p>创建一个存钱计划，开始你的储蓄之旅！</p>
    </div>

    <!-- 计划详情弹窗 -->
    <div v-if="showDetailModal" class="detail-modal" @click.self="closeDetailModal">
      <div class="detail-content">
        <div class="detail-header">
          <div class="detail-icon" :style="{ backgroundColor: currentPlanForDetail?.color || getColorByType(currentPlanForDetail?.type) }">
            <i :class="currentPlanForDetail?.icon || getIconByType(currentPlanForDetail?.type)"></i>
          </div>
          <h3>{{ currentPlanForDetail?.name }}</h3>
          <button class="close-btn" @click="closeDetailModal">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="detail-body">
          <!-- 计划理由 -->
          <div class="detail-section" v-if="currentPlanForDetail?.reason">
            <div class="section-label">
              <i class="fas fa-comment"></i>
              <span>计划理由</span>
            </div>
            <div class="section-content">{{ currentPlanForDetail.reason }}</div>
          </div>

          <!-- 金额信息 -->
          <div class="detail-section">
            <div class="section-label">
              <i class="fas fa-coins"></i>
              <span>金额信息</span>
            </div>
            <div class="amount-info">
              <div class="amount-row">
                <span>目标金额：</span>
                <strong>¥{{ formatNumber(currentPlanForDetail?.targetAmount) }}</strong>
              </div>
              <div class="amount-row">
                <span>已存金额：</span>
                <strong class="current-amount">¥{{ formatNumber(currentPlanForDetail?.currentAmount) }}</strong>
              </div>
              <div class="amount-row">
                <span>剩余金额：</span>
                <strong>¥{{ formatNumber(remainingAmountForDetail) }}</strong>
              </div>
            </div>
          </div>

          <!-- 进度信息 -->
          <div class="detail-section">
            <div class="section-label">
              <i class="fas fa-chart-line"></i>
              <span>进度信息</span>
            </div>
            <div class="progress-info">
              <div class="progress-bar-large">
                <div class="progress-fill-large" :style="{ width: (currentPlanForDetail?.progress || calculateProgress(currentPlanForDetail?.currentAmount, currentPlanForDetail?.targetAmount)) + '%' }"></div>
              </div>
              <div class="progress-percent">{{ currentPlanForDetail?.progress || calculateProgress(currentPlanForDetail?.currentAmount, currentPlanForDetail?.targetAmount) }}%</div>
            </div>
          </div>

          <!-- 时间信息 -->
          <div class="detail-section">
            <div class="section-label">
              <i class="fas fa-calendar-alt"></i>
              <span>时间信息</span>
            </div>
            <div class="time-info">
              <div class="time-row" v-if="currentPlanForDetail?.deadline">
                <i class="far fa-calendar-alt"></i>
                <span>截止日期：{{ formatDate(currentPlanForDetail.deadline) }}</span>
              </div>
              <div class="time-row" v-if="currentPlanForDetail?.createdAt">
                <i class="far fa-calendar-plus"></i>
                <span>创建时间：{{ formatDateTime(currentPlanForDetail.createdAt) }}</span>
              </div>
              <div class="time-row" v-if="currentPlanForDetail?.updatedAt">
                <i class="far fa-calendar-edit"></i>
                <span>更新时间：{{ formatDateTime(currentPlanForDetail.updatedAt) }}</span>
              </div>
            </div>
          </div>

          <!-- 存钱记录 -->
          <div class="detail-section" v-if="currentPlanForDetail?.records && currentPlanForDetail.records.length > 0">
            <div class="section-label">
              <i class="fas fa-history"></i>
              <span>存钱记录（共{{ currentPlanForDetail.records.length }}条）</span>
            </div>
            <div class="records-list">
              <div v-for="record in currentPlanForDetail.records" :key="record.id" class="record-item">
                <div class="record-amount">
                  <i class="fas fa-plus-circle"></i>
                  ¥{{ formatNumber(record.amount) }}
                </div>
                <div class="record-time">
                  <i class="far fa-clock"></i>
                  {{ formatRecordTime(record) }}
                </div>
                <div class="record-note" v-if="record.note">
                  {{ record.note }}
                </div>
              </div>
            </div>
          </div>

          <div class="detail-section" v-else>
            <div class="section-label">
              <i class="fas fa-history"></i>
              <span>存钱记录</span>
            </div>
            <div class="no-records">
              <i class="fas fa-piggy-bank"></i>
              <span>暂无存钱记录，点击下方按钮开始存钱吧！</span>
            </div>
          </div>
        </div>

        <div class="detail-footer">
          <button class="btn-add-money" @click="goToAddMoney">
            <i class="fas fa-plus-circle"></i>
            <span>存钱</span>
          </button>
          <button class="btn-close" @click="closeDetailModal">关闭</button>
        </div>
      </div>
    </div>

    <!-- 个人存钱弹窗 - 简洁版，不显示金额预览 -->
    <div v-if="showAddMoneyModal" class="add-money-modal" @click.self="closeAddMoneyModal">
      <div class="add-money-content">
        <div class="add-money-header">
          <h3><i class="fas fa-piggy-bank"></i> 存入金额</h3>
          <button class="close-btn" @click="closeAddMoneyModal">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="add-money-body">
          <div class="plan-info" v-if="currentPlan">
            <div class="plan-icon" :style="{ backgroundColor: currentPlan.color || getColorByType(currentPlan.type) }">
              <i :class="currentPlan.icon || getIconByType(currentPlan.type)"></i>
            </div>
            <div class="plan-details">
              <h4>{{ currentPlan.name }}</h4>
              <p class="plan-reason">{{ currentPlan.reason }}</p>
              <div class="plan-progress">
                <span>当前进度: {{ currentPlan.progress || calculateProgress(currentPlan.currentAmount, currentPlan.targetAmount) }}%</span>
                <span>已存: ¥{{ formatNumber(currentPlan.currentAmount) }} / ¥{{ formatNumber(currentPlan.targetAmount) }}</span>
              </div>
              <div class="plan-deadline" v-if="currentPlan.deadline">
                <i class="far fa-calendar-alt"></i>
                截止: {{ formatDate(currentPlan.deadline) }}
              </div>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-coins"></i> 存入金额</label>
            <input
                v-model.number="addMoneyForm.amount"
                type="number"
                class="form-input"
                :class="{ 'input-error': isAmountExceeding }"
                placeholder="请输入存入金额"
                min="0.01"
                step="0.01"
                required
                @keyup.enter="handleAddMoney"
                @input="checkAmountWarning"
            >
            <div class="input-hint" v-if="remainingAmount > 0">
              <i class="fas fa-info-circle"></i>
              最多可存 ¥{{ formatNumber(remainingAmount) }}
            </div>
            <!-- 警告信息 -->
            <div class="warning-message" v-if="isAmountExceeding">
              <i class="fas fa-exclamation-triangle"></i>
              ⚠️ 警告：存入金额超过剩余额度 {{ formatNumber(exceedingAmount) }}元，无法存钱！
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-comment"></i> 备注（选填）</label>
            <textarea
                v-model="addMoneyForm.note"
                class="form-input form-textarea"
                placeholder="输入备注信息..."
                rows="2"
            ></textarea>
          </div>
        </div>

        <div class="add-money-footer">
          <button class="btn-cancel" @click="closeAddMoneyModal">取消</button>
          <button
              class="btn-confirm"
              @click="handleAddMoney"
              :disabled="!isAmountValid || submitting || isAmountExceeding"
          >
            <i v-if="submitting" class="fas fa-spinner fa-spin"></i>
            <span v-else>确认存入</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { savingService } from '@/services'
import { notificationService } from '@/services'

const props = defineProps({
  personalSavings: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete', 'create', 'update-plan'])

// ========== 详情弹窗状态 ==========
const showDetailModal = ref(false)
const currentPlanForDetail = ref(null)

// ========== 存钱弹窗状态 ==========
const showAddMoneyModal = ref(false)
const currentPlan = ref(null)
const submitting = ref(false)

const addMoneyForm = reactive({
  amount: '',
  note: ''
})

// ========== 工具函数 ==========
const getIconByType = (type) => {
  const icons = {
    '日常储蓄': 'fas fa-coins',
    '旅行基金': 'fas fa-plane',
    '教育基金': 'fas fa-graduation-cap',
    '购房基金': 'fas fa-home',
    '购车基金': 'fas fa-car',
    '应急资金': 'fas fa-first-aid',
    '其他': 'fas fa-star'
  }
  return icons[type] || 'fas fa-piggy-bank'
}

const getColorByType = (type) => {
  const colors = {
    '日常储蓄': '#2ecc71',
    '旅行基金': '#3498DB',
    '教育基金': '#9B59B6',
    '购房基金': '#E74C3C',
    '购车基金': '#F39C12',
    '应急资金': '#E67E22',
    '其他': '#80A492'
  }
  return colors[type] || '#80A492'
}

const calculateProgress = (current, target) => {
  if (!target || target <= 0) return 0
  if (!current || current <= 0) return 0
  const progress = (current / target) * 100
  return Math.min(Math.round(progress), 100)
}

const formatNumber = (num) => {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  const date = new Date(dateTimeStr)
  if (isNaN(date.getTime())) return dateTimeStr
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const formatRecordTime = (record) => {
  if (record.depositDate) {
    return record.depositDate
  }
  if (record.depositTime) {
    return formatDate(record.depositTime)
  }
  if (record.createdAt) {
    return formatDate(record.createdAt)
  }
  return ''
}

const getPlanClass = (plan) => {
  if (plan.completed || plan.progress >= 100) return 'completed'
  if (plan.progress < 30) return 'warning'
  return ''
}

// ========== 计算属性 ==========
const isAmountValid = computed(() => {
  if (!addMoneyForm.amount || addMoneyForm.amount <= 0) return false

  const amount = parseFloat(addMoneyForm.amount)
  if (isNaN(amount) || amount <= 0) return false

  return true
})

// 检查是否超出目标金额（大于剩余金额）
const isAmountExceeding = computed(() => {
  if (!currentPlan.value) return false
  const amount = parseFloat(addMoneyForm.amount) || 0
  return amount > remainingAmount.value
})

// 超出金额
const exceedingAmount = computed(() => {
  if (!currentPlan.value || !isAmountExceeding.value) return 0
  const amount = parseFloat(addMoneyForm.amount) || 0
  return amount - remainingAmount.value
})

// 获取剩余可存金额
const remainingAmount = computed(() => {
  if (!currentPlan.value) return 0
  const target = currentPlan.value.targetAmount || 0
  const current = currentPlan.value.currentAmount || 0
  return Math.max(0, target - current)
})

// 详情弹窗的剩余金额
const remainingAmountForDetail = computed(() => {
  if (!currentPlanForDetail.value) return 0
  const target = currentPlanForDetail.value.targetAmount || 0
  const current = currentPlanForDetail.value.currentAmount || 0
  return Math.max(0, target - current)
})

// ========== 方法 ==========
const checkAmountWarning = () => {
  // 这个方法现在只用于触发重新计算，警告显示通过computed实现
}

// ========== 详情弹窗方法 ==========
const openDetailModal = (plan) => {
  currentPlanForDetail.value = plan
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  setTimeout(() => {
    currentPlanForDetail.value = null
  }, 200)
}

const goToAddMoney = async () => {
  if (currentPlanForDetail.value) {
    const planData = JSON.parse(JSON.stringify(currentPlanForDetail.value))
    closeDetailModal()
    setTimeout(() => {
      openAddMoneyModal(planData)
    }, 150)
  }
}

// ========== 存钱弹窗方法 ==========
const openAddMoneyModal = (plan) => {
  // 深拷贝计划数据，避免引用问题
  currentPlan.value = JSON.parse(JSON.stringify(plan))
  addMoneyForm.amount = ''
  addMoneyForm.note = ''
  showAddMoneyModal.value = true
}

const closeAddMoneyModal = () => {
  showAddMoneyModal.value = false
  currentPlan.value = null
  addMoneyForm.amount = ''
  addMoneyForm.note = ''
}

// ========== 存钱逻辑 ==========
const handleAddMoney = async () => {
  if (!addMoneyForm.amount || addMoneyForm.amount <= 0) {
    notificationService.showNotification('请输入有效的金额', 'warning')
    return
  }

  if (!currentPlan.value) {
    notificationService.showNotification('计划不存在', 'error')
    return
  }

  const amount = parseFloat(addMoneyForm.amount)
  if (isNaN(amount) || amount <= 0) {
    notificationService.showNotification('请输入有效的金额', 'warning')
    return
  }

  // 验证是否超过剩余金额
  if (amount > remainingAmount.value) {
    notificationService.showNotification(`存入金额不能超过剩余额度，最多可存 ¥${formatNumber(remainingAmount.value)}`, 'warning')
    return
  }

  submitting.value = true

  try {
    console.log('【PersonalSaving】正在存入计划ID:', currentPlan.value.id)
    console.log('【PersonalSaving】存入数据:', {
      amount,
      note: addMoneyForm.note || '',
      depositTime: new Date().toISOString()
    })

    const response = await savingService.depositToPersonalSaving(currentPlan.value.id, {
      amount: amount,
      note: addMoneyForm.note || ''
    })

    console.log('【PersonalSaving】API响应:', response)

    if (response.code === 200) {
      notificationService.showNotification(`成功存入 ¥${formatNumber(amount)}`, 'success')

      const newTotal = (currentPlan.value.currentAmount || 0) + amount
      const updatedPlan = response.data?.plan || {
        ...currentPlan.value,
        currentAmount: newTotal,
        progress: calculateProgress(newTotal, currentPlan.value.targetAmount),
        completed: newTotal >= currentPlan.value.targetAmount,
        updatedAt: new Date().toISOString()
      }

      emit('update-plan', updatedPlan)
      closeAddMoneyModal()
    } else {
      notificationService.showNotification(response.message || '存钱失败', 'error')
    }
  } catch (error) {
    console.error('【PersonalSaving】存钱失败详细错误:', error)

    let errorMsg = '存钱失败，请稍后重试'
    if (error.message) {
      if (error.message.includes('超过目标金额') || error.message.includes('最多可存')) {
        errorMsg = error.message
      } else {
        errorMsg = error.message
      }
    }
    notificationService.showNotification(errorMsg, 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.savings-section {
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
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--primary-color);
}

.section-title h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-color);
  margin: 0;
}

.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-light);
}

.loading-state i {
  font-size: 40px;
  color: var(--accent-color);
  margin-bottom: 15px;
}

.loading-state p {
  font-size: 14px;
}

.savings-list {
  margin-bottom: 20px;
}

.savings-item {
  position: relative;
  display: flex;
  padding: 15px;
  border-radius: 15px;
  margin-bottom: 15px;
  background-color: rgba(213, 235, 225, 0.2);
  border-left: 5px solid var(--primary-color);
  transition: all 0.3s;
}

.savings-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.08);
}

.savings-item.completed {
  border-left-color: var(--success-color);
  background-color: rgba(46, 204, 113, 0.1);
}

.savings-item.warning {
  border-left-color: var(--warning-color);
  background-color: rgba(243, 156, 18, 0.1);
}

.card-actions {
  position: absolute;
  top: 10px;
  right: 25px;
  z-index: 2;
  display: flex;
  gap: 8px;
}

.edit-btn,
.delete-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  background-color: var(--white);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 14px;
}

.edit-btn {
  color: #3498db;
}

.edit-btn:hover {
  background-color: #3498db;
  color: white;
  transform: translateY(-2px);
}

.delete-btn {
  color: #e74c3c;
}

.delete-btn:hover {
  background-color: #e74c3c;
  color: white;
  transform: translateY(-2px);
}

.savings-content {
  flex: 1;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  padding-right: 40px;
}

.savings-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 22px;
  color: white;
  flex-shrink: 0;
}

.savings-info {
  flex: 1;
}

.savings-info h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 5px;
  color: var(--text-dark);
}

.savings-info p {
  font-size: 13px;
  color: var(--text-light);
  margin-bottom: 8px;
  line-height: 1.4;
}

.savings-amount {
  font-weight: 600;
  color: var(--accent-color);
  font-size: 14px;
  margin-bottom: 8px;
}

.savings-progress {
  margin-top: 8px;
  margin-bottom: 8px;
}

.progress-bar {
  height: 6px;
  background-color: rgba(128, 164, 146, 0.2);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 5px;
}

.progress-fill {
  height: 100%;
  background-color: var(--accent-color);
  border-radius: 3px;
  transition: width 0.5s;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-light);
}

.deadline-info,
.create-time-info {
  font-size: 12px;
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
}

.deadline-info i,
.create-time-info i {
  font-size: 12px;
}

.savings-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-left: 15px;
  padding-left: 15px;
  border-left: 1px dashed var(--secondary-color);
  min-width: 100px;
}

.savings-add-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  border: none;
  border-radius: 30px;
  padding: 10px 20px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  box-shadow: 0 4px 10px rgba(128, 164, 146, 0.3);
  width: 100%;
  justify-content: center;
  margin-top: 40px;
}

.savings-add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(128, 164, 146, 0.4);
}

.savings-add-btn i {
  font-size: 18px;
}

.completed-badge {
  margin-top: 10px;
  color: var(--success-color);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: rgba(46, 204, 113, 0.1);
  padding: 4px 8px;
  border-radius: 20px;
  width: 100%;
  justify-content: center;
}

.completed-badge i {
  font-size: 14px;
}

.action-placeholder {
  margin-top: 10px;
  height: 24px;
  width: 100%;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-light);
}

.empty-state i {
  font-size: 80px;
  color: var(--secondary-color);
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 20px;
  margin-bottom: 10px;
  color: var(--accent-color);
}

.empty-state p {
  font-size: 14px;
  margin-bottom: 25px;
  color: var(--text-light);
}

/* 详情弹窗样式 */
.detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.detail-content {
  background-color: var(--white);
  border-radius: 25px;
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
}

.detail-header {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 20px 20px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  border-radius: 25px 25px 0 0;
}

.detail-icon {
  width: 70px;
  height: 70px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
  margin-bottom: 15px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.detail-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: white;
  margin: 0;
  text-align: center;
}

.detail-header .close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  font-size: 18px;
  color: white;
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.detail-header .close-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.detail-body {
  padding: 20px;
}

.detail-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(128, 164, 146, 0.2);
}

.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-color);
  margin-bottom: 12px;
}

.section-label i {
  font-size: 16px;
}

.section-content {
  font-size: 14px;
  color: var(--text-dark);
  line-height: 1.5;
  background-color: rgba(213, 235, 225, 0.1);
  padding: 12px;
  border-radius: 12px;
}

.amount-info {
  background-color: rgba(213, 235, 225, 0.1);
  padding: 12px;
  border-radius: 12px;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.amount-row:not(:last-child) {
  border-bottom: 1px dashed rgba(128, 164, 146, 0.2);
}

.amount-row span {
  font-size: 14px;
  color: var(--text-light);
}

.amount-row strong {
  font-size: 16px;
  color: var(--accent-color);
}

.amount-row .current-amount {
  color: var(--primary-color);
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.progress-bar-large {
  flex: 1;
  height: 10px;
  background-color: rgba(128, 164, 146, 0.2);
  border-radius: 5px;
  overflow: hidden;
}

.progress-fill-large {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
  border-radius: 5px;
  transition: width 0.5s;
}

.progress-percent {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-color);
  min-width: 45px;
  text-align: right;
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-light);
}

.time-row i {
  width: 20px;
  color: var(--accent-color);
}

.records-list {
  max-height: 250px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 10px;
  font-size: 13px;
}

.record-item .record-amount {
  color: var(--accent-color);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.record-item .record-amount i {
  font-size: 12px;
}

.record-item .record-time {
  color: var(--text-light);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.record-item .record-note {
  color: var(--text-light);
  font-size: 12px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-records {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 30px;
  text-align: center;
  color: var(--text-light);
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 12px;
}

.no-records i {
  font-size: 40px;
  color: var(--secondary-color);
}

.no-records span {
  font-size: 13px;
}

.detail-footer {
  display: flex;
  gap: 15px;
  padding: 20px;
  border-top: 1px solid var(--primary-color);
  background-color: white;
  border-radius: 0 0 25px 25px;
}

.btn-add-money {
  flex: 1;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  border: none;
  border-radius: 30px;
  padding: 12px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s;
}

.btn-add-money:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(128, 164, 146, 0.3);
}

.btn-close {
  flex: 1;
  background-color: #f0f0f0;
  border: none;
  border-radius: 30px;
  padding: 12px;
  color: var(--text-light);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-close:hover {
  background-color: #e0e0e0;
}

/* 存钱弹窗样式 - 简洁版 */
.add-money-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 3001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.add-money-content {
  background-color: var(--white);
  border-radius: 25px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
}

.add-money-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--primary-color);
  background: linear-gradient(135deg, var(--primary-color) 0%, white 100%);
  border-radius: 25px 25px 0 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.add-money-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--accent-color);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.add-money-header h3 i {
  font-size: 24px;
}

.add-money-header .close-btn {
  position: static;
  background: none;
  border: none;
  color: var(--text-light);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
}

.add-money-header .close-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
  color: var(--text-dark);
}

.add-money-body {
  padding: 25px;
}

.plan-info {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
  padding: 15px;
  background-color: rgba(213, 235, 225, 0.2);
  border-radius: 15px;
}

.plan-icon {
  width: 60px;
  height: 60px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  flex-shrink: 0;
}

.plan-details {
  flex: 1;
}

.plan-details h4 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-dark);
  margin: 0 0 5px 0;
}

.plan-reason {
  font-size: 13px;
  color: var(--text-light);
  margin-bottom: 8px;
}

.plan-progress {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 5px;
}

.plan-deadline {
  font-size: 12px;
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent-color);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--secondary-color);
  border-radius: 12px;
  font-size: 15px;
  color: var(--text-dark);
  transition: all 0.3s;
  background-color: rgba(213, 235, 225, 0.1);
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.form-input.input-error {
  border-color: #e74c3c;
  background-color: rgba(231, 76, 60, 0.05);
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
}

.input-hint {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-hint i {
  font-size: 12px;
  color: var(--accent-color);
}

.warning-message {
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #fee;
  color: #e74c3c;
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #fcc;
}

.warning-message i {
  font-size: 14px;
  color: #e74c3c;
}

.add-money-footer {
  padding: 20px;
  border-top: 1px solid var(--primary-color);
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  position: sticky;
  bottom: 0;
  background-color: white;
  z-index: 10;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 25px;
  border: none;
  border-radius: 25px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background-color: #f0f0f0;
  color: var(--text-light);
}

.btn-cancel:hover {
  background-color: #e0e0e0;
}

.btn-confirm {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  color: white;
  font-weight: 600;
}

.btn-confirm:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(128, 164, 146, 0.3);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 500px) {
  .savings-item {
    flex-direction: column;
  }

  .savings-content {
    margin-bottom: 15px;
    padding-right: 0;
  }

  .savings-actions {
    margin-left: 0;
    padding-left: 0;
    border-left: none;
    border-top: 1px dashed var(--secondary-color);
    padding-top: 15px;
    justify-content: center;
    width: 100%;
  }

  .savings-add-btn {
    width: 100%;
  }

  .detail-content,
  .add-money-content {
    max-width: 95%;
  }

  .detail-footer,
  .add-money-footer {
    flex-direction: column;
  }

  .detail-footer button,
  .add-money-footer button {
    width: 100%;
  }

  .plan-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .section-title {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .card-actions {
    top: 5px;
    right: 5px;
  }

  .record-item {
    flex-wrap: wrap;
  }

  .record-item .record-note {
    width: 100%;
    margin-left: 20px;
  }

  .progress-info {
    flex-direction: column;
    align-items: stretch;
  }

  .progress-percent {
    text-align: center;
  }
}
</style>