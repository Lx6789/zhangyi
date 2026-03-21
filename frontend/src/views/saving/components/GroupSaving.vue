<template>
  <section class="savings-section">
    <div class="section-title">
      <h2>多人存钱计划</h2>
      <i class="fas fa-user-friends"></i>
    </div>

    <div class="savings-list" v-if="groupSavings.length > 0">
      <div
          v-for="plan in groupSavings"
          :key="plan.id"
          class="savings-item"
          :class="getPlanClass(plan)"
      >
        <!-- 右上角操作按钮 - 仅创建者可见 -->
        <div class="card-actions" v-if="isCreator(plan)">
          <button class="edit-btn" @click.stop="$emit('edit', plan)" title="编辑计划">
            <i class="fas fa-edit"></i>
          </button>
          <button class="delete-btn" @click.stop="$emit('delete', plan)" title="删除计划">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>

        <!-- 卡片主体内容 -->
        <div class="savings-content" @click="viewPlanDetails(plan)">
          <div class="savings-icon" :style="{ backgroundColor: plan.color }">
            <i :class="plan.icon"></i>
          </div>
          <div class="savings-info">
            <h3>{{ plan.name }}
              <span class="member-count">({{ getActiveMemberCount(plan) }}人)</span>
            </h3>
            <p>{{ plan.reason }}</p>
            <div class="savings-amount">已存 ¥{{ formatNumber(getActiveTotalAmount(plan)) }} / 目标 ¥{{ formatNumber(plan.targetAmount) }}</div>
            <div class="savings-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: plan.progress + '%' }"></div>
              </div>
              <div class="progress-text">
                <span>{{ plan.type }}</span>
                <span>{{ plan.progress }}%</span>
              </div>
            </div>

            <!-- 成员预览 - 只显示活跃成员 -->
            <div class="members-preview" v-if="getActiveMembers(plan).length > 0">
              <div
                  v-for="(member, index) in getActiveMembers(plan).slice(0, 3)"
                  :key="index"
                  class="preview-avatar"
                  :title="member.name"
              >
                {{ member.avatar || member.name?.charAt(0) || '?' }}
              </div>
              <div v-if="getActiveMembers(plan).length > 3" class="preview-avatar more">
                +{{ getActiveMembers(plan).length - 3 }}
              </div>
            </div>
          </div>
        </div>

        <!-- 底部操作按钮区域 -->
        <div class="savings-actions">
          <!-- 存钱按钮（所有人都可见） -->
          <button
              class="savings-add-btn"
              @click.stop="openAddMoneyModal(plan)"
              title="存入金额"
              :disabled="getActiveMembers(plan).length === 0"
          >
            <i class="fas fa-plus-circle"></i>
            <span>存钱</span>
          </button>

          <!-- 退出按钮（所有人都可见） -->
          <button class="savings-leave-btn" @click.stop="openLeaveModal(plan)" title="退出计划">
            <i class="fas fa-sign-out-alt"></i>
            <span>退出</span>
          </button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <i :class="isOnline ? 'fas fa-hands-helping' : 'fas fa-wifi-slash'"></i>
      <h3>{{ isOnline ? '暂无多人存钱计划' : '无法连接服务器' }}</h3>
      <p v-if="isOnline">创建一个与家人或朋友一起的存钱计划！</p>
      <p v-else class="offline-note">当前处于离线模式，请连接网络后重试</p>
    </div>

    <!-- 多人存钱弹窗 -->
    <div v-if="showAddMoneyModal" class="add-money-modal" @click.self="showAddMoneyModal = false">
      <div class="add-money-content">
        <div class="add-money-header">
          <h3><i class="fas fa-piggy-bank"></i> 存入金额</h3>
          <button class="close-btn" @click="showAddMoneyModal = false">
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
                <span>当前进度: {{ calculateProgress(getActiveTotalAmount(currentPlan), currentPlan?.targetAmount) }}%</span>
                <span>已存: ¥{{ formatNumber(getActiveTotalAmount(currentPlan)) }} / ¥{{ formatNumber(currentPlan?.targetAmount) }}</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-user"></i> 选择成员</label>
            <select v-model="addMoneyForm.memberId" class="form-input" required>
              <option value="">请选择要存入的成员</option>
              <!-- 只显示活跃成员 -->
              <option
                  v-for="member in getActiveMembers(currentPlan)"
                  :key="member.userId"
                  :value="member.userId"
              >
                {{ member.name }} {{ member.isCreator ? '(创建者)' : '' }}
                (当前已存: ¥{{ formatNumber(member.amount) }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label><i class="fas fa-coins"></i> 存入金额</label>
            <input v-model="addMoneyForm.amount" type="number" class="form-input" placeholder="请输入存入金额" min="0.01" step="0.01" required>
          </div>

          <div class="form-group">
            <label><i class="fas fa-comment"></i> 备注</label>
            <textarea v-model="addMoneyForm.note" class="form-input form-textarea" placeholder="输入备注信息..." rows="2"></textarea>
          </div>
        </div>

        <div class="add-money-footer">
          <button class="btn-cancel" @click="showAddMoneyModal = false">取消</button>
          <button class="btn-confirm" @click="handleAddMoney" :disabled="!addMoneyForm.memberId || !addMoneyForm.amount || submitting">
            <i v-if="submitting" class="fas fa-spinner fa-spin"></i>
            <span v-else>确认存入</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 退出确认弹窗 - 普通成员 -->
    <div v-if="showLeaveConfirmModal && !isLeavingCreator" class="delete-confirm-modal" @click.self="showLeaveConfirmModal = false">
      <div class="delete-confirm-content">
        <div class="delete-confirm-header" style="background-color: #fff3cd;">
          <i class="fas fa-sign-out-alt" style="color: #f39c12;"></i>
          <h3 style="color: #e67e22;">确认退出</h3>
        </div>
        <div class="delete-confirm-body">
          <p>确定要退出存钱计划 <strong>"{{ planToLeave?.name }}"</strong> 吗？</p>
          <p class="warning-text">退出后您将不再参与此计划，已存金额将保留。</p>
        </div>
        <div class="delete-confirm-footer">
          <button class="btn-cancel" @click="showLeaveConfirmModal = false">取消</button>
          <button class="btn-leave" @click="handleLeavePlan(null)" :disabled="leaving">
            <i v-if="leaving" class="fas fa-spinner fa-spin"></i>
            <span v-else>确认退出</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 创建者退出弹窗 - 选择新创建者 -->
    <div v-if="showLeaveConfirmModal && isLeavingCreator" class="friend-selector-modal" @click.self="showLeaveConfirmModal = false">
      <div class="friend-selector-content" style="max-width: 550px;">
        <div class="friend-selector-header" style="background-color: #fff3cd;">
          <h3 style="color: #e67e22;"><i class="fas fa-crown"></i> 创建者退出</h3>
          <button class="close-btn" @click="showLeaveConfirmModal = false">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="friend-selector-body" style="padding: 20px;">
          <div class="plan-info" style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 12px;">
            <div class="plan-icon" :style="{ backgroundColor: getPlanColor(planToLeave) }" style="width: 50px; height: 50px;">
              <i :class="getPlanIcon(planToLeave)"></i>
            </div>
            <div class="plan-details">
              <h4 style="margin: 0 0 5px 0;">{{ planToLeave?.name }}</h4>
              <p style="margin: 0; font-size: 13px; color: #666;">请选择一位成员接替您成为新的创建者</p>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-user-friends"></i> 选择新创建者</label>
            <div class="members-list" style="max-height: 300px; overflow-y: auto;">
              <!-- 只显示活跃成员（排除已删除的和当前用户） -->
              <div
                  v-for="member in otherActiveMembers"
                  :key="member.userId"
                  class="member-item"
                  :class="{ 'selected-member': selectedNewCreatorId === member.userId }"
                  @click="selectedNewCreatorId = member.userId"
                  style="cursor: pointer; transition: all 0.2s;"
              >
                <div class="member-avatar">{{ member.avatar || member.name?.charAt(0) || '?' }}</div>
                <div class="member-info">
                  <h4>{{ member.name }}</h4>
                  <p>已存: ¥{{ formatNumber(member.amount) }}</p>
                </div>
                <div class="member-checkbox">
                  <i :class="selectedNewCreatorId === member.userId ? 'fas fa-check-circle' : 'far fa-circle'" style="color: #f39c12; font-size: 24px;"></i>
                </div>
              </div>
            </div>
            <p v-if="otherActiveMembers.length === 0" class="warning-text" style="text-align: center; padding: 20px;">
              没有其他活跃成员可选，您不能退出（请直接删除计划）
            </p>
          </div>
        </div>

        <div class="friend-selector-footer">
          <div class="selected-count" v-if="selectedNewCreatorId">
            已选择: {{ getMemberName(selectedNewCreatorId) }}
          </div>
          <div class="footer-buttons">
            <button class="btn-cancel" @click="showLeaveConfirmModal = false">取消</button>
            <button
                class="btn-leave"
                @click="handleLeavePlan(selectedNewCreatorId)"
                :disabled="!selectedNewCreatorId || leaving || otherActiveMembers.length === 0"
            >
              <i v-if="leaving" class="fas fa-spinner fa-spin"></i>
              <span v-else>确认退出并移交权限</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, defineProps, defineEmits } from 'vue'
import { savingService, notificationService } from '@/services'

const props = defineProps({
  groupSavings: {
    type: Array,
    required: true
  },
  isOnline: {
    type: Boolean,
    required: true
  },
  currentUser: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit', 'delete', 'view-details', 'update:groupSavings'])

// ========== 本地状态 ==========
// 多人存钱弹窗
const showAddMoneyModal = ref(false)
const currentPlan = ref(null)
const addMoneyForm = reactive({
  memberId: '',
  amount: '',
  note: ''
})

// 退出相关
const showLeaveConfirmModal = ref(false)
const planToLeave = ref(null)
const isLeavingCreator = ref(false)
const selectedNewCreatorId = ref(null)
const leaving = ref(false)

// 提交状态
const submitting = ref(false)

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

const getPlanIcon = (plan) => {
  if (!plan) return 'fas fa-piggy-bank'
  return plan.icon || getIconByType(plan.type)
}

const getPlanColor = (plan) => {
  if (!plan) return '#80A492'
  return plan.color || getColorByType(plan.type)
}

const formatNumber = (num) => num !== undefined && num !== null ? num.toLocaleString('zh-CN') : '0'

const getMemberName = (userId) => {
  if (!planToLeave.value || !planToLeave.value.members) return ''
  const member = planToLeave.value.members.find(m => m.userId === userId)
  return member?.name || ''
}

const isCreator = (plan) => plan?.creatorId === props.currentUser?.id

const calculateProgress = (current, target) => {
  if (!target || target <= 0) return 0
  if (!current || current <= 0) return 0
  const progress = (current / target) * 100
  return Math.min(Math.round(progress), 100)
}

const getPlanClass = (plan) => {
  if (plan.completed || plan.progress >= 100) return 'completed'
  if (plan.progress < 30) return 'warning'
  return ''
}

// ========== 软删除相关工具函数 ==========
/**
 * 获取计划的活跃成员（过滤掉已删除的）
 * @param {Object} plan - 计划对象
 * @returns {Array} 活跃成员列表
 */
const getActiveMembers = (plan) => {
  if (!plan || !plan.members) return []
  return plan.members.filter(member => member.deleted !== 1)
}

/**
 * 计算活跃成员数量
 * @param {Object} plan - 计划对象
 * @returns {number} 活跃成员数量
 */
const getActiveMemberCount = (plan) => {
  return getActiveMembers(plan).length
}

/**
 * 计算活跃成员的总金额
 * @param {Object} plan - 计划对象
 * @returns {number} 活跃成员总金额
 */
const getActiveTotalAmount = (plan) => {
  const activeMembers = getActiveMembers(plan)
  return activeMembers.reduce((sum, member) => sum + (member.amount || 0), 0)
}

// ========== 计算属性 ==========
/**
 * 其他活跃成员（用于创建者退出时选择）
 */
const otherActiveMembers = computed(() => {
  if (!planToLeave.value || !planToLeave.value.members) return []
  // 过滤掉已删除的成员和当前用户
  return planToLeave.value.members.filter(m =>
      m.userId !== props.currentUser?.id && m.deleted !== 1
  )
})

// ========== 计划详情 ==========
const viewPlanDetails = (plan) => {
  emit('view-details', plan)
}

// ========== 多人存钱操作 ==========
const openAddMoneyModal = (plan) => {
  currentPlan.value = plan
  addMoneyForm.memberId = ''
  addMoneyForm.amount = ''
  addMoneyForm.note = ''
  showAddMoneyModal.value = true
}

const handleAddMoney = async () => {
  // 验证输入
  if (!addMoneyForm.memberId) {
    notificationService.showNotification('请选择要存入的成员', 'warning')
    return
  }

  if (!addMoneyForm.amount || addMoneyForm.amount <= 0) {
    notificationService.showNotification('请输入有效的存入金额', 'warning')
    return
  }

  const amount = parseFloat(addMoneyForm.amount)
  if (isNaN(amount) || amount <= 0) {
    notificationService.showNotification('金额必须大于0', 'warning')
    return
  }

  // 检查当前计划是否存在
  if (!currentPlan.value || !currentPlan.value.id) {
    notificationService.showNotification('计划信息不存在', 'error')
    return
  }

  // 获取选中的成员信息，用于验证（只从活跃成员中查找）
  const selectedMember = getActiveMembers(currentPlan.value).find(
      m => m.userId === addMoneyForm.memberId
  )

  if (!selectedMember) {
    notificationService.showNotification('选中的成员不存在或已被删除', 'error')
    return
  }

  // 验证是否超过目标金额（使用活跃成员总金额）
  const currentTotal = getActiveTotalAmount(currentPlan.value)
  const targetAmount = currentPlan.value.targetAmount || 0

  if (currentTotal + amount > targetAmount) {
    const remainingAmount = targetAmount - currentTotal
    notificationService.showNotification(
        `存入金额超过目标金额，最多可存 ¥${remainingAmount.toFixed(2)}`,
        'warning'
    )
    return
  }

  submitting.value = true

  try {
    console.log('开始存钱操作:', {
      planId: currentPlan.value.id,
      planName: currentPlan.value.name,
      memberId: addMoneyForm.memberId,
      memberName: selectedMember.name,
      currentAmount: selectedMember.amount || 0,
      depositAmount: amount,
      note: addMoneyForm.note || ''
    })

    // 调用 saving.service.js 中的 depositToGroupSaving 方法
    const response = await savingService.depositToGroupSaving(
        currentPlan.value.id,
        {
          memberId: addMoneyForm.memberId,
          amount: amount,
          note: addMoneyForm.note || ''
        }
    )

    console.log('存钱响应:', response)

    if (response.code === 200) {
      // 存钱成功
      const successMessage = response.data?.memberTotal
          ? `成功存入 ¥${amount.toFixed(2)}，该成员累计已存 ¥${response.data.memberTotal.toFixed(2)}`
          : `成功存入 ¥${amount.toFixed(2)}`

      notificationService.showNotification(successMessage, 'success')

      // 关闭弹窗
      showAddMoneyModal.value = false

      // 重置表单
      addMoneyForm.memberId = ''
      addMoneyForm.amount = ''
      addMoneyForm.note = ''

      // 更新本地数据
      updateLocalPlanAfterDeposit(response.data)
    } else {
      // 存钱失败
      notificationService.showNotification(
          response.message || '存钱失败，请重试',
          'error'
      )
    }
  } catch (error) {
    console.error('存钱操作异常:', error)

    // 处理网络错误
    if (error.message?.includes('Network Error') || !navigator.onLine) {
      notificationService.showNotification(
          '网络连接失败，请检查网络后重试',
          'error'
      )
    } else {
      notificationService.showNotification(
          error.message || '存钱失败，请稍后重试',
          'error'
      )
    }
  } finally {
    submitting.value = false
  }
}

// 存钱后更新本地计划数据
const updateLocalPlanAfterDeposit = (depositData) => {
  if (!depositData) return

  // 找到当前计划在列表中的索引
  const planIndex = props.groupSavings.findIndex(p => p.id === currentPlan.value.id)
  if (planIndex === -1) return

  // 创建更新后的计划对象
  const updatedPlan = {...props.groupSavings[planIndex]}

  // 更新计划总金额
  if (depositData.planTotal !== undefined) {
    updatedPlan.currentAmount = depositData.planTotal
  }

  // 更新进度
  if (depositData.progress !== undefined) {
    updatedPlan.progress = depositData.progress
  }

  // 更新成员金额
  if (depositData.memberId && depositData.memberTotal !== undefined) {
    const memberIndex = updatedPlan.members?.findIndex(m => m.userId === depositData.memberId)
    if (memberIndex !== -1 && updatedPlan.members) {
      updatedPlan.members[memberIndex] = {
        ...updatedPlan.members[memberIndex],
        amount: depositData.memberTotal
      }
    }
  }

  // 更新 completed 状态
  updatedPlan.completed = getActiveTotalAmount(updatedPlan) >= updatedPlan.targetAmount

  // 创建新的数组并触发更新
  const newGroupSavings = [...props.groupSavings]
  newGroupSavings[planIndex] = updatedPlan
  emit('update:groupSavings', newGroupSavings)
}

// ========== 退出计划 ==========
const openLeaveModal = (plan) => {
  planToLeave.value = plan
  isLeavingCreator.value = isCreator(plan)
  selectedNewCreatorId.value = null
  showLeaveConfirmModal.value = true
}

const handleLeavePlan = async (newCreatorId) => {
  if (!planToLeave.value) return

  leaving.value = true

  try {
    const response = await savingService.leaveGroupSavings(planToLeave.value.id, {
      isCreator: isLeavingCreator.value,
      newCreatorId: newCreatorId
    })

    if (response.code === 200) {
      // 从列表中移除
      const index = props.groupSavings.findIndex(g => g.id === planToLeave.value.id)
      if (index !== -1) {
        const newGroupSavings = [...props.groupSavings]
        newGroupSavings.splice(index, 1)
        emit('update:groupSavings', newGroupSavings)
      }
      notificationService.showNotification('退出成功', 'success')
    } else {
      notificationService.showNotification(response.message || '退出失败', 'error')
    }

    showLeaveConfirmModal.value = false
    planToLeave.value = null

  } catch (error) {
    console.error('退出失败:', error)
    notificationService.showNotification('退出失败: ' + error.message, 'error')
  } finally {
    leaving.value = false
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

.member-count {
  font-size: 12px;
  color: var(--text-light);
}

.savings-info p {
  font-size: 13px;
  color: var(--text-light);
  margin-bottom: 5px;
}

.savings-amount {
  font-weight: 600;
  color: var(--accent-color);
  font-size: 14px;
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
  padding-left: 15px;
  border-left: 1px dashed var(--secondary-color);
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

.savings-add-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(128, 164, 146, 0.4);
}

.savings-add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.savings-add-btn i {
  font-size: 18px;
}

.savings-leave-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5253 100%);
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
  box-shadow: 0 4px 10px rgba(238, 82, 83, 0.3);
  margin-top: 10px;
  width: 100%;
  justify-content: center;
}

.savings-leave-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(238, 82, 83, 0.4);
}

.members-preview {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
}

.preview-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--secondary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--accent-color);
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.preview-avatar.more {
  background-color: var(--primary-color);
  font-size: 11px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-light);
}

.empty-state i {
  font-size: 60px;
  color: var(--secondary-color);
  margin-bottom: 15px;
}

.empty-state h3 {
  font-size: 18px;
  margin-bottom: 10px;
  color: var(--accent-color);
}

.empty-state p {
  font-size: 14px;
  margin-bottom: 20px;
}

.offline-note {
  margin-top: 10px;
  color: #856404;
  font-size: 13px;
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

/* 退出确认弹窗样式 */
.delete-confirm-modal {
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

.delete-confirm-content {
  background-color: var(--white);
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  overflow: hidden;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
}

.delete-confirm-header {
  background-color: #fff3cd;
  padding: 20px;
  text-align: center;
}

.delete-confirm-header i {
  font-size: 48px;
  color: #f39c12;
  margin-bottom: 10px;
}

.delete-confirm-header h3 {
  font-size: 20px;
  color: #e67e22;
  margin: 0;
}

.delete-confirm-body {
  padding: 25px 20px;
  text-align: center;
}

.delete-confirm-body p {
  font-size: 16px;
  color: var(--text-dark);
  margin-bottom: 10px;
}

.warning-text {
  color: #e74c3c !important;
  font-size: 14px !important;
}

.delete-confirm-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-leave {
  padding: 10px 25px;
  border: none;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
  color: white;
}

.btn-leave:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(243, 156, 18, 0.3);
}

.btn-leave:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 成员选择样式 */
.member-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--secondary-color);
  border-radius: 12px;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.member-item.selected-member {
  background-color: rgba(243, 156, 18, 0.1);
  border: 2px solid #f39c12;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--secondary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-color);
  font-size: 16px;
  margin-right: 12px;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
}

.member-info h4 {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 3px;
}

.member-info p {
  font-size: 12px;
  color: var(--text-light);
}

.member-checkbox {
  margin-left: 10px;
  display: flex;
  align-items: center;
}

.friend-selector-modal {
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

.friend-selector-content {
  background-color: var(--white);
  border-radius: 25px;
  width: 100%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
}

.friend-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--primary-color);
  background-color: #fff3cd;
  border-radius: 25px 25px 0 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.friend-selector-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #e67e22;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.friend-selector-body {
  padding: 20px;
}

.friend-selector-footer {
  padding: 20px;
  border-top: 1px solid var(--primary-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  bottom: 0;
  background-color: white;
  z-index: 10;
}

.selected-count {
  font-size: 14px;
  color: var(--text-light);
}

.footer-buttons {
  display: flex;
  gap: 15px;
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
  }

  .savings-add-btn,
  .savings-leave-btn {
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
}
</style>