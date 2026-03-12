<template>
  <section class="savings-section">
    <div class="section-title">
      <h2>我的存钱计划</h2>
      <i class="fas fa-bullseye"></i>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>加载存钱计划中...</p>
    </div>

    <!-- 计划列表 -->
    <div v-else-if="personalSavings.length > 0" class="savings-list">
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

        <!-- 卡片主体内容 - 点击打开记录弹窗 -->
        <div class="savings-content" @click="openRecordModal(plan)">
          <div class="savings-icon" :style="{ backgroundColor: getPlanColor(plan) }">
            <i :class="getPlanIcon(plan)"></i>
          </div>
          <div class="savings-info">
            <h3>{{ plan.name }}</h3>
            <p>{{ plan.reason }}</p>
            <div class="savings-amount">
              已存 ¥{{ formatNumber(plan.currentAmount) }} /
              目标 ¥{{ formatNumber(plan.targetAmount) }}
            </div>
            <div class="savings-progress">
              <div class="progress-bar">
                <div
                    class="progress-fill"
                    :style="{ width: getProgressWidth(plan) }"
                ></div>
              </div>
              <div class="progress-text">
                <span>{{ plan.type }}</span>
                <span>{{ getProgressPercentage(plan) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部操作按钮区域 -->
        <div class="savings-actions">
          <button class="savings-add-btn" @click.stop="openAddMoneyModal(plan)" title="存入金额">
            <i class="fas fa-plus-circle"></i>
            <span>存钱</span>
          </button>
          <div v-if="plan.deadline" class="deadline-info">
            <i class="far fa-calendar-alt"></i>
            <span>截止: {{ formatDate(plan.deadline) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <i class="fas fa-piggy-bank"></i>
      <h3>暂无存钱计划</h3>
      <p>开始您的第一个存钱目标吧！</p>
      <button class="create-btn" @click="$emit('create')">
        <i class="fas fa-plus"></i>
        创建计划
      </button>
    </div>

    <!-- 个人存钱弹窗 -->
    <div v-if="showAddMoneyModal" class="add-money-modal" @click.self="closeAddMoneyModal">
      <div class="add-money-content">
        <div class="add-money-header">
          <h3><i class="fas fa-piggy-bank"></i> 个人存钱</h3>
          <button class="close-btn" @click="closeAddMoneyModal">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="add-money-body">
          <div class="plan-info">
            <div class="plan-icon" :style="{ backgroundColor: getPlanColor(currentPlan) }">
              <i :class="getPlanIcon(currentPlan)"></i>
            </div>
            <div class="plan-details">
              <h4>{{ currentPlan?.name }}</h4>
              <p class="plan-reason">{{ currentPlan?.reason }}</p>
              <div class="plan-progress">
                <span>当前进度: {{ getProgressPercentage(currentPlan) }}%</span>
                <span>已存: ¥{{ formatNumber(currentPlan?.currentAmount) }} / ¥{{ formatNumber(currentPlan?.targetAmount) }}</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-coins"></i> 存入金额</label>
            <input
                v-model.number="addMoneyForm.amount"
                type="number"
                class="form-input"
                placeholder="请输入存入金额"
                min="0.01"
                step="0.01"
                required
                @keyup.enter="handleAddMoney"
            >
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
              :disabled="!addMoneyForm.amount || submitting"
          >
            <i v-if="submitting" class="fas fa-spinner fa-spin"></i>
            <span v-else>确认存入</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 个人存钱记录弹窗 -->
    <div v-if="showRecordModal" class="plan-detail-modal" @click.self="closeRecordModal">
      <div class="modal-content detail-modal" style="max-width: 600px !important;">
        <div class="modal-header">
          <i class="fas fa-history" style="color: #80A492;"></i>
          <h3>存钱记录 - {{ recordPlan?.name }}</h3>
          <button class="modal-close" @click="closeRecordModal">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="plan-info" style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 12px;">
            <div class="plan-icon" :style="{ backgroundColor: getPlanColor(recordPlan) }" style="width: 50px; height: 50px;">
              <i :class="getPlanIcon(recordPlan)"></i>
            </div>
            <div class="plan-details">
              <h4 style="margin: 0 0 5px 0;">{{ recordPlan?.name }}</h4>
              <p style="margin: 0; font-size: 13px; color: #666;">目标: ¥{{ formatNumber(recordPlan?.targetAmount) }} | 当前: ¥{{ formatNumber(recordPlan?.currentAmount) }} | 进度: {{ getProgressPercentage(recordPlan) }}%</p>
            </div>
          </div>

          <div class="analysis-card">
            <div class="card-header">
              <div class="header-title">
                <i class="fas fa-list"></i>
                <span>存钱明细</span>
              </div>
              <span class="record-count">共 {{ depositRecords.length }} 条记录</span>
            </div>
            <div class="card-body">
              <div v-if="loadingRecords" class="loading-state small">
                <i class="fas fa-spinner fa-spin"></i>
                <p>加载记录中...</p>
              </div>

              <div v-else-if="depositRecords.length === 0" class="empty-state small">
                <i class="fas fa-coins"></i>
                <p>暂无存钱记录</p>
              </div>

              <div v-else class="records-list">
                <div
                    v-for="record in depositRecords"
                    :key="record.id"
                    class="record-item"
                    style="padding: 12px; border-bottom: 1px solid #D5EBE1; display: flex; justify-content: space-between; align-items: center;"
                >
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <i class="far fa-clock" style="color: #80A492; font-size: 12px;"></i>
                      <span style="font-size: 13px; color: #666;">{{ formatDateTime(record.time) }}</span>
                    </div>
                    <div v-if="record.note" style="font-size: 12px; color: #999; margin-left: 20px;">
                      备注: {{ record.note }}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 16px; font-weight: 600; color: #2ecc71;">+¥{{ formatNumber(record.amount) }}</div>
                    <div style="font-size: 11px; color: #999;">余额: ¥{{ formatNumber(record.afterAmount) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="closeRecordModal">关闭</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
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

// 个人存钱弹窗
const showAddMoneyModal = ref(false)
const currentPlan = ref(null)
const addMoneyForm = ref({
  amount: '',
  note: ''
})
const submitting = ref(false)

// 个人存钱记录弹窗
const showRecordModal = ref(false)
const recordPlan = ref(null)
const depositRecords = ref([])
const loadingRecords = ref(false)

// ========== 工具函数 - 图标和颜色 ==========
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

const getPlanIcon = (plan) => {
  if (!plan) return 'fas fa-piggy-bank'
  return plan.icon || getIconByType(plan.type)
}

const getPlanColor = (plan) => {
  if (!plan) return '#80A492'
  return plan.color || getColorByType(plan.type)
}

// ========== 进度计算函数 ==========
/**
 * 计算进度百分比
 * @param {number} current - 当前已存金额
 * @param {number} target - 目标金额
 * @returns {number} 进度百分比（0-100）
 */
const calculateProgress = (current, target) => {
  if (!target || target <= 0) return 0
  if (!current || current <= 0) return 0
  const progress = (current / target) * 100
  return Math.min(Math.round(progress), 100)
}

/**
 * 获取进度条宽度样式
 * @param {Object} plan - 计划对象
 * @returns {string} 宽度样式，如 '50%'
 */
const getProgressWidth = (plan) => {
  if (!plan) return '0%'
  const progress = calculateProgress(plan.currentAmount, plan.targetAmount)
  return `${progress}%`
}

/**
 * 获取进度百分比显示
 * @param {Object} plan - 计划对象
 * @returns {number} 进度百分比
 */
const getProgressPercentage = (plan) => {
  if (!plan) return 0
  return calculateProgress(plan.currentAmount, plan.targetAmount)
}

/**
 * 判断计划是否完成
 * @param {Object} plan - 计划对象
 * @returns {boolean} 是否完成
 */
const isPlanCompleted = (plan) => {
  if (!plan) return false
  return (plan.currentAmount || 0) >= (plan.targetAmount || 0)
}

/**
 * 获取计划样式类
 * @param {Object} plan - 计划对象
 * @returns {string} CSS类名
 */
const getPlanClass = (plan) => {
  if (!plan) return ''
  const progress = calculateProgress(plan.currentAmount, plan.targetAmount)
  if (progress >= 100) return 'completed'
  if (progress < 30) return 'warning'
  return ''
}

// ========== 格式化函数 ==========
const formatNumber = (num) => {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  const date = new Date(dateTimeStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// ========== 存钱功能 ==========
// 打开存钱弹窗
const openAddMoneyModal = (plan) => {
  currentPlan.value = plan
  addMoneyForm.value = {
    amount: '',
    note: ''
  }
  showAddMoneyModal.value = true
}

// 关闭存钱弹窗
const closeAddMoneyModal = () => {
  showAddMoneyModal.value = false
  currentPlan.value = null
  addMoneyForm.value = {
    amount: '',
    note: ''
  }
}

// 处理存钱
const handleAddMoney = async () => {
  // 验证金额
  if (!addMoneyForm.value.amount || addMoneyForm.value.amount <= 0) {
    notificationService.showNotification('请输入有效的存入金额', 'warning')
    return
  }

  const amount = Number(addMoneyForm.value.amount)
  const plan = currentPlan.value

  if (!plan) return

  // 验证是否超过目标金额
  const newTotal = (plan.currentAmount || 0) + amount
  if (newTotal > plan.targetAmount) {
    notificationService.showNotification('存入金额超过目标金额', 'warning')
    return
  }

  submitting.value = true

  try {
    // 调用 savingService 的存钱方法
    const response = await savingService.depositToPersonalSaving(plan.id, {
      amount: amount,
      note: addMoneyForm.value.note || ''
    })

    if (response.code === 200) {
      notificationService.showNotification(`成功存入 ¥${amount}`, 'success')

      // 使用本地进度计算函数更新数据
      const updatedPlan = {
        ...plan,
        currentAmount: newTotal,
        // 不需要传递 progress 和 completed，让父组件自己计算
      }

      // 通知父组件更新数据
      emit('update-plan', updatedPlan)

      // 关闭弹窗
      closeAddMoneyModal()
    } else {
      notificationService.showNotification(response.message || '存钱失败', 'error')
    }
  } catch (error) {
    console.error('存钱失败:', error)
    notificationService.showNotification('存钱失败，请重试', 'error')
  } finally {
    submitting.value = false
  }
}

// ========== 记录功能 ==========
// 打开记录弹窗
const openRecordModal = (plan) => {
  recordPlan.value = plan
  loadDepositRecords(plan.id)
  showRecordModal.value = true
}

// 关闭记录弹窗
const closeRecordModal = () => {
  showRecordModal.value = false
  recordPlan.value = null
  depositRecords.value = []
}

// 加载存钱记录
const loadDepositRecords = async (planId) => {
  loadingRecords.value = true

  try {
    // 这里应该调用获取记录的方法
    // 暂时用模拟数据
    setTimeout(() => {
      depositRecords.value = [
        {
          id: 1,
          time: new Date().toISOString(),
          amount: 100,
          note: '第一次存钱',
          afterAmount: 100
        },
        {
          id: 2,
          time: new Date(Date.now() - 86400000).toISOString(),
          amount: 200,
          note: '第二次存钱',
          afterAmount: 300
        }
      ]
      loadingRecords.value = false
    }, 500)
  } catch (error) {
    console.error('加载存钱记录失败:', error)
    notificationService.showNotification('加载记录失败', 'error')
    loadingRecords.value = false
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

.section-title i {
  color: var(--tertiary-color);
  font-size: 18px;
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
  margin-bottom: 15px;
  animation: spin 1s linear infinite;
}

.loading-state p {
  font-size: 14px;
  color: var(--text-light);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

.savings-item.completed .progress-fill {
  background-color: var(--success-color);
}

.savings-item.warning {
  border-left-color: var(--warning-color);
  background-color: rgba(243, 156, 18, 0.1);
}

.savings-item.warning .progress-fill {
  background-color: var(--warning-color);
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
  margin-bottom: 5px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.savings-amount {
  font-weight: 600;
  color: var(--accent-color);
  font-size: 14px;
  margin-bottom: 8px;
}

.savings-progress {
  margin-top: 8px;
}

.progress-bar {
  height: 6px;
  background-color: rgba(128, 164, 146, 0.2);
  border-radius: 3px;
  overflow: hidden;
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
  margin-top: 5px;
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

.savings-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-left: 15px;
  margin-top: 40px;
  padding-left: 15px;
  border-left: 1px dashed var(--secondary-color);
  min-width: 100px;
}

.savings-add-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  border: none;
  border-radius: 30px;
  padding: 8px 16px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
  box-shadow: 0 4px 10px rgba(128, 164, 146, 0.3);
  width: 100%;
  justify-content: center;
}

.savings-add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(128, 164, 146, 0.4);
}

.savings-add-btn i {
  font-size: 16px;
}

.deadline-info {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 4px;
}

.deadline-info i {
  font-size: 11px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-light);
}

.empty-state i {
  font-size: 80px;
  color: var(--secondary-color);
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 18px;
  margin-bottom: 10px;
  color: var(--accent-color);
}

.empty-state p {
  font-size: 14px;
  margin-bottom: 25px;
  color: var(--text-light);
}

.create-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  border: none;
  border-radius: 30px;
  padding: 12px 30px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(128, 164, 146, 0.3);
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(128, 164, 146, 0.4);
}

.create-btn i {
  font-size: 16px;
}

/* 存钱弹窗样式 */
.add-money-modal {
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

.add-money-content {
  background-color: var(--white);
  border-radius: 25px;
  width: 100%;
  max-width: 600px;
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
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-light);
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.add-money-header .close-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
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
  margin-bottom: 5px;
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

.form-textarea {
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
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

/* 记录弹窗样式 */
.plan-detail-modal {
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

.modal-content.detail-modal {
  max-width: 600px !important;
  width: 95%;
  padding: 0 !important;
  overflow: hidden !important;
  background-color: #f8fafc;
  border-radius: 20px;
}

.modal-header {
  display: flex;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #D5EBE1;
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
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

.modal-body {
  padding: 25px;
  max-height: calc(80vh - 120px);
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 20px 25px;
  border-top: 1px solid #D5EBE1;
  background: white;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.modal-footer .btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #f0f0f0;
  color: #666;
}

.modal-footer .btn-secondary:hover {
  background-color: #e0e0e0;
}

.analysis-card {
  background: white;
  border-radius: 16px;
  margin-bottom: 25px;
  border: 1px solid #D5EBE1;
  overflow: hidden;
}

.card-header {
  padding: 15px 20px;
  border-bottom: 1px solid #D5EBE1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(213, 235, 225, 0.2);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title i {
  color: #80A492;
  font-size: 16px;
}

.header-title span {
  font-size: 15px;
  font-weight: 600;
  color: #80A492;
}

.record-count {
  font-size: 13px;
  color: #999;
  background: rgba(128, 164, 146, 0.1);
  padding: 4px 10px;
  border-radius: 20px;
}

.card-body {
  padding: 20px;
}

.empty-state.small {
  padding: 20px;
  text-align: center;
  color: var(--text-light);
}

.empty-state.small i {
  font-size: 32px;
  color: var(--secondary-color);
  margin-bottom: 10px;
}

.loading-state.small {
  padding: 20px;
  text-align: center;
  color: var(--text-light);
}

.loading-state.small i {
  font-size: 32px;
  color: var(--accent-color);
  margin-bottom: 10px;
}

.record-item {
  padding: 12px;
  border-bottom: 1px solid #D5EBE1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-item:last-child {
  border-bottom: none;
}

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
    min-width: auto;
  }

  .savings-add-btn {
    width: 100%;
    max-width: 200px;
  }

  .deadline-info {
    justify-content: center;
  }

  .add-money-content {
    max-width: 95%;
  }

  .add-money-footer {
    flex-direction: column;
  }

  .add-money-footer button {
    width: 100%;
  }

  .plan-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .modal-footer {
    flex-direction: column;
  }

  .modal-footer button {
    width: 100%;
  }
}
</style>