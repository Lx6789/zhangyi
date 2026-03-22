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
        <!-- 右上角操作按钮 - 所有人都可见（个人计划） -->
        <div class="card-actions">
          <button class="edit-btn" @click.stop="$emit('edit', plan)" title="编辑计划">
            <i class="fas fa-edit"></i>
          </button>
          <button class="delete-btn" @click.stop="$emit('delete', plan)" title="删除计划">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>

        <!-- 卡片主体内容 - 可点击查看详情（为了一致性，添加点击事件） -->
        <div class="savings-content" @click="openAddMoneyModal(plan)">
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
          </div>
        </div>

        <!-- 底部操作按钮区域 - 与多人存钱样式一致，但没有退出按钮 -->
        <div class="savings-actions">
          <!-- 存钱按钮 -->
          <button class="savings-add-btn" @click.stop="openAddMoneyModal(plan)" title="存入金额">
            <i class="fas fa-plus-circle"></i>
            <span>存钱</span>
          </button>

          <!-- 完成状态标记（替代退出按钮的位置） -->
          <div v-if="plan.completed || plan.progress >= 100" class="completed-badge">
            <i class="fas fa-check-circle"></i>
            <span>已完成</span>
          </div>
          <!-- 占位元素，保持布局一致（当未完成时） -->
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

    <!-- 个人存钱弹窗 -->
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

          <!-- 金额预览 -->
          <div class="amount-preview" v-if="addMoneyForm.amount && addMoneyForm.amount > 0">
            <div class="preview-row">
              <span>当前已存:</span>
              <span>¥{{ formatNumber(currentPlan?.currentAmount || 0) }}</span>
            </div>
            <div class="preview-row plus">
              <i class="fas fa-plus-circle"></i>
              <span>存入: ¥{{ formatNumber(addMoneyForm.amount) }}</span>
            </div>
            <div class="preview-row total">
              <span>存入后总计:</span>
              <span class="amount-total">¥{{ formatNumber((currentPlan?.currentAmount || 0) + addMoneyForm.amount) }}</span>
            </div>
            <div class="preview-warning" v-if="(currentPlan?.currentAmount || 0) + addMoneyForm.amount > (currentPlan?.targetAmount || 0)">
              <i class="fas fa-exclamation-triangle"></i>
              超过目标金额 {{ formatNumber(((currentPlan?.currentAmount || 0) + addMoneyForm.amount) - (currentPlan?.targetAmount || 0)) }}元
            </div>
          </div>
        </div>

        <div class="add-money-footer">
          <button class="btn-cancel" @click="closeAddMoneyModal">取消</button>
          <button
              class="btn-confirm"
              @click="handleAddMoney"
              :disabled="!isAmountValid || submitting"
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

  // 检查是否超过目标金额
  if (currentPlan.value) {
    const newTotal = (currentPlan.value.currentAmount || 0) + amount
    if (newTotal > (currentPlan.value.targetAmount || 0)) {
      return false
    }
  }

  return true
})

// 获取剩余可存金额
const remainingAmount = computed(() => {
  if (!currentPlan.value) return 0
  const target = currentPlan.value.targetAmount || 0
  const current = currentPlan.value.currentAmount || 0
  return Math.max(0, target - current)
})

// 预览存入后的金额
const previewAfterAmount = computed(() => {
  if (!currentPlan.value) return 0
  const amount = parseFloat(addMoneyForm.amount) || 0
  return (currentPlan.value.currentAmount || 0) + amount
})

// 预览是否超出目标
const isExceedingTarget = computed(() => {
  if (!currentPlan.value) return false
  const target = currentPlan.value.targetAmount || 0
  return previewAfterAmount.value > target
})

// 超出金额
const exceedingAmount = computed(() => {
  if (!currentPlan.value || !isExceedingTarget.value) return 0
  const target = currentPlan.value.targetAmount || 0
  return previewAfterAmount.value - target
})

// ========== 弹窗方法 ==========
const openAddMoneyModal = (plan) => {
  currentPlan.value = plan
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
  // 验证金额
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

  const newTotal = (currentPlan.value.currentAmount || 0) + amount

  // 验证是否超过目标金额
  if (newTotal > currentPlan.value.targetAmount) {
    const maxAmount = currentPlan.value.targetAmount - (currentPlan.value.currentAmount || 0)
    notificationService.showNotification(`存入金额不能超过目标金额，最多可存 ¥${formatNumber(maxAmount)}`, 'warning')
    return
  }

  submitting.value = true

  try {
    console.log('【PersonalSaving】正在存入计划ID:', currentPlan.value.id)
    console.log('【PersonalSaving】存入数据:', { amount, note: addMoneyForm.note || '' })

    // 调用个人存钱API
    const response = await savingService.depositToPersonalSaving(currentPlan.value.id, {
      amount: amount,
      note: addMoneyForm.note || ''
    })

    console.log('【PersonalSaving】API响应:', response)

    if (response.code === 200) {
      notificationService.showNotification(`成功存入 ¥${formatNumber(amount)}`, 'success')

      // 获取更新后的计划数据
      const updatedPlan = response.data?.plan || {
        ...currentPlan.value,
        currentAmount: newTotal,
        progress: calculateProgress(newTotal, currentPlan.value.targetAmount),
        completed: newTotal >= currentPlan.value.targetAmount
      }

      // 通知父组件更新
      emit('update-plan', updatedPlan)

      // 关闭弹窗
      closeAddMoneyModal()
    } else {
      notificationService.showNotification(response.message || '存钱失败', 'error')
    }
  } catch (error) {
    console.error('【PersonalSaving】存钱失败详细错误:', error)

    // 处理错误信息
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

// ========== 计划操作 ==========
const handleEdit = (plan) => {
  emit('edit', plan)
}

const handleDelete = (plan) => {
  emit('delete', plan)
}

const handleCreate = () => {
  emit('create')
}

// 格式化进度文本
const formatProgressText = (progress) => {
  if (progress === undefined || progress === null) return '0%'
  return `${progress}%`
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

.add-plan-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  border: none;
  border-radius: 30px;
  padding: 8px 16px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
}

.add-plan-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(128, 164, 146, 0.3);
}

.add-plan-btn i {
  font-size: 16px;
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
}

.loading-state p {
  font-size: 14px;
}

/* 计划列表 */
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

/* 卡片操作按钮 - 与多人存钱样式一致 */
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

/* 卡片主体内容 - 与多人存钱样式一致 */
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

.deadline-info {
  font-size: 12px;
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 5px;
}

.deadline-info i {
  font-size: 12px;
}

/* 右侧操作区域 - 与多人存钱样式一致，但没有退出按钮 */
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
  margin-top: 40px; /* 与多人存钱的存钱按钮位置一致 */
}

.savings-add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(128, 164, 146, 0.4);
}

.savings-add-btn i {
  font-size: 18px; /* 与多人存钱图标大小一致 */
}

.completed-badge {
  margin-top: 10px; /* 与多人存钱退出按钮的位置一致 */
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

/* 占位元素 - 保持布局一致 */
.action-placeholder {
  margin-top: 10px;
  height: 24px; /* 与退出按钮高度一致 */
  width: 100%;
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

.btn-create {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  border: none;
  border-radius: 30px;
  padding: 12px 30px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.btn-create:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(128, 164, 146, 0.4);
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

.close-btn {
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

.close-btn:hover {
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

.form-textarea {
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
}

/* 金额预览 */
.amount-preview {
  background-color: rgba(213, 235, 225, 0.2);
  padding: 15px;
  border-radius: 12px;
  margin-top: 10px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.preview-row.plus {
  color: var(--accent-color);
  border-bottom: 1px dashed var(--secondary-color);
}

.preview-row.total {
  font-weight: 600;
  margin-top: 5px;
  padding-top: 10px;
  border-top: 1px solid var(--secondary-color);
}

.amount-total {
  color: var(--accent-color);
  font-size: 16px;
}

.preview-warning {
  margin-top: 10px;
  padding: 8px 12px;
  background-color: #fff3cd;
  color: #856404;
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-warning i {
  color: #f39c12;
}

/* 弹窗底部按钮 */
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

/* 响应式设计 - 与多人存钱一致 */
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

  .section-title {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .add-plan-btn {
    width: 100%;
    justify-content: center;
  }

  .card-actions {
    top: 5px;
    right: 5px;
  }
}
</style>