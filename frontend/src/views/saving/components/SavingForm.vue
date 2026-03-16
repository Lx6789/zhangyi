<template>
  <section class="add-savings-form">
    <div class="section-title">
      <div class="title-with-back">
        <h2>{{ formTitle }}</h2>
        <button v-if="isEditing" class="back-to-add-btn" @click="resetToAdd">
          <i class="fas fa-plus-circle"></i>
          <span>新增</span>
        </button>
      </div>
      <i class="fas fa-plus-circle"></i>
    </div>

    <form @submit.prevent="submitForm">
      <!-- 存钱目标名称 -->
      <div class="form-group">
        <label><i class="fas fa-tag"></i> 存钱目标名称</label>
        <input
            v-model="form.name"
            type="text"
            class="form-input"
            placeholder="例如：买一台新电脑"
            required
        >
      </div>

      <!-- 存钱理由（非必填） -->
      <div class="form-group">
        <label><i class="fas fa-comment"></i> 存钱理由</label>
        <textarea
            v-model="form.reason"
            class="form-input form-textarea"
            placeholder="为什么要存钱？...（选填）"
        ></textarea>
        <div class="input-hint">
          <i class="fas fa-info-circle"></i> 选填
        </div>
      </div>

      <!-- 金额相关 - 个人存钱模式 -->
      <template v-if="currentSavingsType === 'personal'">
        <div class="form-row">
          <div class="form-group">
            <label><i class="fas fa-bullseye"></i> 目标金额</label>
            <input
                v-model.number="form.targetAmount"
                type="number"
                class="form-input"
                min="1"
                step="0.01"
                placeholder="输入目标金额"
                required
            >
          </div>
          <div class="form-group">
            <label><i class="fas fa-wallet"></i> 已存金额</label>
            <input
                v-model.number="form.currentAmount"
                type="number"
                class="form-input"
                min="0"
                step="0.01"
                :placeholder="currentAmountPlaceholder"
                :required="false"
            >
            <div class="input-hint" v-if="!isEditing">
              <i class="fas fa-info-circle"></i> 留空则默认为0元
            </div>
          </div>
        </div>
      </template>

      <!-- 多人存钱模式 - 成员管理区域（仅在多人模式下显示） -->
      <template v-else>
        <!-- 目标金额（多人模式共用） -->
        <div class="form-row">
          <div class="form-group">
            <label><i class="fas fa-bullseye"></i> 目标金额</label>
            <input
                v-model.number="form.targetAmount"
                type="number"
                class="form-input"
                min="1"
                step="0.01"
                placeholder="输入目标金额"
                required
            >
          </div>
          <div class="form-group">
            <label><i class="fas fa-wallet"></i> 总已存金额</label>
            <input
                :value="totalCurrentAmount"
                type="text"
                class="form-input"
                readonly
                disabled
            >
            <div class="input-hint">
              <i class="fas fa-info-circle"></i> 由成员金额自动计算
            </div>
          </div>
        </div>

        <!-- 成员管理区域（仅多人存钱显示） -->
        <div class="members-section">
          <div class="members-header">
            <label><i class="fas fa-users"></i> 计划成员</label>
            <button type="button" class="add-member-btn" @click="openFriendSelector">
              <i class="fas fa-user-plus"></i> 添加成员
            </button>
          </div>

          <!-- 成员列表 -->
          <div class="members-list" v-if="form.members && form.members.length > 0">
            <div
                v-for="(member, index) in form.members"
                :key="member.userId || index"
                class="member-item-form"
                :class="{ 'creator-item': member.isCreator }"
            >
              <div class="member-avatar">
                {{ member.avatar || member.name?.charAt(0) || '?' }}
              </div>

              <div class="member-details">
                <div class="member-name-row">
                  <span class="member-name">{{ member.name }}</span>
                  <span v-if="member.isCreator" class="creator-badge">
                    <i class="fas fa-crown"></i> 创建者
                  </span>
                  <span v-if="member.phone" class="member-phone">{{ member.phone }}</span>
                </div>

                <div class="member-amount-row">
                  <label>已存金额：</label>
                  <input
                      v-model.number="member.amount"
                      type="number"
                      class="member-amount-input"
                      min="0"
                      step="0.01"
                      placeholder="输入金额"
                      @input="updateTotalAmount"
                  >
                </div>
              </div>

              <button
                  v-if="!member.isCreator"
                  type="button"
                  class="remove-member-btn"
                  @click="removeMember(index)"
                  title="移除成员"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div v-else class="no-members">
            <i class="fas fa-user-friends"></i>
            <p>暂无成员，请添加好友一起存钱</p>
          </div>
        </div>
      </template>

      <!-- 日期和类型（所有模式共用） -->
      <div class="form-row">
        <div class="form-group">
          <label><i class="fas fa-calendar-alt"></i> 截止日期</label>
          <input
              v-model="form.deadline"
              type="date"
              class="form-input"
              :min="today"
              required
          >
        </div>
        <div class="form-group">
          <label><i class="fas fa-list"></i> 存钱类型</label>
          <select v-model="form.type" class="form-input">
            <option value="日常储蓄">日常储蓄</option>
            <option value="旅行基金">旅行基金</option>
            <option value="教育基金">教育基金</option>
            <option value="购房基金">购房基金</option>
            <option value="购车基金">购车基金</option>
            <option value="应急资金">应急资金</option>
            <option value="其他">其他</option>
          </select>
        </div>
      </div>

      <!-- 验证提示 -->
      <div v-if="validationError" class="validation-error">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ validationError }}</span>
      </div>

      <!-- 表单操作按钮 -->
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="resetForm">
          <i class="fas fa-redo"></i> 重置
        </button>
        <button type="submit" class="btn btn-primary" :disabled="submitting || !isFormValid">
          <i v-if="submitting" class="fas fa-spinner fa-spin"></i>
          <i v-else :class="isEditing ? 'fas fa-save' : 'fas fa-check'"></i>
          <span>{{ submitButtonText }}</span>
        </button>
      </div>
    </form>

    <!-- 好友选择器弹窗（直接放在 SavingForm 中管理） -->
    <FriendSelector
        v-model:visible="showFriendSelector"
        :initial-selected="selectedFriends"
        @confirm="handleFriendConfirm"
        @close="showFriendSelector = false"
    />
  </section>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import FriendSelector from './FriendSelector.vue'
import { savingService } from '@/services'
import { notificationService } from '@/services'

const props = defineProps({
  formTitle: {
    type: String,
    required: true
  },
  initialForm: {
    type: Object,
    default: () => ({
      name: '',
      reason: '',
      targetAmount: '',
      currentAmount: '',
      deadline: '',
      type: '日常储蓄'
      // 注意：个人模式没有 members 字段
    })
  },
  isEditing: {
    type: Boolean,
    required: true
  },
  isEditingOwnPlan: {
    type: Boolean,
    required: true
  },
  currentSavingsType: {
    type: String,
    required: true
  },
  currentUser: {
    type: Object,
    required: true
  },
  editingId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits([
  'submit-success',
  'reset-form'
])

// ========== 工具函数 ==========
const getDefaultDeadline = () => {
  const today = new Date()
  const oneMonthLater = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
  return oneMonthLater.toISOString().split('T')[0]
}

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
  return Math.min(Math.round((current / target) * 100), 100)
}

// ========== 表单数据 ==========
const form = reactive({
  name: '',
  reason: '',
  targetAmount: '',
  currentAmount: '',
  deadline: getDefaultDeadline(),
  type: '日常储蓄',
  members: [] // 仅在多人模式下使用
})

// 好友选择器状态 - 直接在 SavingForm 中管理
const showFriendSelector = ref(false)
const selectedFriends = ref([]) // 暂存选中的好友，用于传递给 FriendSelector

// 提交状态
const submitting = ref(false)

// 验证错误
const validationError = ref('')

// 获取今天日期（用于日期选择器的最小值）
const today = computed(() => {
  const date = new Date()
  return date.toISOString().split('T')[0]
})

// 已存金额的占位符文本（个人模式）
const currentAmountPlaceholder = computed(() => {
  return props.isEditing ? '当前已存金额' : '留空则默认为0'
})

// 计算总已存金额（多人模式）
const totalCurrentAmount = computed(() => {
  if (props.currentSavingsType !== 'group') return '0'
  if (!form.members || form.members.length === 0) return '0'
  const total = form.members.reduce((sum, member) => {
    const amount = Number(member.amount) || 0
    return sum + amount
  }, 0)
  return total.toLocaleString('zh-CN')
})

// 表单是否有效
const isFormValid = computed(() => {
  // 目标金额必须有值且大于0
  if (!form.targetAmount || form.targetAmount <= 0) return false

  // 名称不能为空
  if (!form.name.trim()) return false

  // 截止日期不能为空
  if (!form.deadline) return false

  // 个人模式：验证已存金额
  if (props.currentSavingsType === 'personal') {
    if (form.currentAmount !== '' && form.currentAmount !== null) {
      const current = Number(form.currentAmount)
      const target = Number(form.targetAmount)
      if (current > target) return false
    }
    return true
  }

  // 多人模式：必须有成员
  if (props.currentSavingsType === 'group') {
    if (!form.members || form.members.length === 0) return false
  }

  return true
})

// 提交按钮文本
const submitButtonText = computed(() => {
  if (submitting.value) return '提交中...'
  return props.isEditing ? '更新计划' : '创建计划'
})

// ========== 监听器 ==========
// 监听初始表单数据变化
watch(() => props.initialForm, (newVal) => {
  if (newVal && Object.keys(newVal).length > 0) {
    // 基础字段赋值
    form.name = newVal.name || ''
    form.reason = newVal.reason || ''
    form.targetAmount = newVal.targetAmount || ''
    form.deadline = newVal.deadline || getDefaultDeadline()
    form.type = newVal.type || '日常储蓄'

    // 个人模式：处理 currentAmount
    if (props.currentSavingsType === 'personal') {
      form.currentAmount = newVal.currentAmount !== undefined ? newVal.currentAmount : ''
      form.members = [] // 清空成员列表
    }

    // 多人模式：处理成员数据
    if (props.currentSavingsType === 'group') {
      form.currentAmount = '' // 个人存金额在多人模式下不使用
      if (newVal.members) {
        form.members = newVal.members.map(m => ({
          ...m,
          amount: m.amount || 0
        }))
      } else {
        form.members = []
        // 确保创建者在成员列表中
        ensureCreatorInMembers()
      }
    }
  }
}, { immediate: true, deep: true })

// 监听当前金额变化，验证是否超过目标金额（个人模式）
watch(() => form.currentAmount, () => {
  if (props.currentSavingsType === 'personal') {
    validateAmounts()
  }
})

// 监听目标金额变化（所有模式都需要验证）
watch(() => form.targetAmount, () => {
  validateAmounts()
})

// 监听存钱类型变化
watch(() => props.currentSavingsType, (newType) => {
  if (newType === 'group' && !props.isEditing) {
    // 新增多人计划时，自动添加当前用户作为创建者
    ensureCreatorInMembers()
  } else if (newType === 'personal') {
    // 切换到个人模式时，清空成员数据
    form.members = []
  }
})

// ========== 方法 ==========
// 验证金额
const validateAmounts = () => {
  if (props.currentSavingsType === 'personal') {
    if (form.currentAmount === '' || form.currentAmount === null) {
      validationError.value = ''
      return
    }

    const current = Number(form.currentAmount) || 0
    const target = Number(form.targetAmount) || 0

    if (target > 0 && current > target) {
      validationError.value = '已存金额不能大于目标金额'
    } else {
      validationError.value = ''
    }
  } else if (props.currentSavingsType === 'group') {
    // 多人模式：验证成员金额总和
    const total = form.members.reduce((sum, m) => sum + (Number(m.amount) || 0), 0)
    const target = Number(form.targetAmount) || 0
    if (target > 0 && total > target) {
      validationError.value = '成员已存金额总和不能大于目标金额'
    } else {
      validationError.value = ''
    }
  }
}

// 更新总金额（触发计算属性更新）- 仅多人模式使用
const updateTotalAmount = () => {
  validateAmounts()
}

// 确保创建者在成员列表中 - 仅多人模式使用
const ensureCreatorInMembers = () => {
  if (props.currentSavingsType !== 'group') return
  if (!props.currentUser || !props.currentUser.id) return

  const hasCreator = form.members.some(m => m.isCreator)

  if (!hasCreator) {
    form.members.unshift({
      userId: parseInt(props.currentUser.id),
      name: props.currentUser.username || '我',
      avatar: props.currentUser.avatar,
      amount: 0,
      isCreator: true
    })
  }
}

/**
 * 打开好友选择器 - 直接在 SavingForm 中处理
 */
const openFriendSelector = () => {
  if (props.currentSavingsType !== 'group') return

  // 如果是编辑模式，从 form.members 中取出非创建者的成员作为已选中的好友
  if (props.isEditing && form.members.length > 0) {
    selectedFriends.value = form.members
        .filter(m => !m.isCreator)
        .map(m => ({
          friendId: m.friendId || m.userId,
          userId: m.userId,
          nickname: m.name,
          avatar: m.avatar
        }))
  } else {
    selectedFriends.value = []
  }

  // 直接显示好友选择器
  showFriendSelector.value = true
}

/**
 * 处理好友确认选择 - 从 FriendSelector 接收选中的好友
 * @param {Array} selected - 选中的好友列表
 */
const handleFriendConfirm = (selected) => {
  console.log('从 FriendSelector 接收选中的好友:', selected)

  // 清空现有非创建者成员
  form.members = form.members.filter(m => m.isCreator)

  // 添加选中的好友
  selected.forEach(friend => {
    // 验证数据
    if (!friend.userId || !friend.friendId) {
      console.error('好友数据不完整:', friend)
      notificationService.showNotification(`好友 ${friend.name || friend.nickname} 信息不完整`, 'error')
      return
    }

    // 确保 userId 是数字且在 Integer 范围内
    const userId = parseInt(friend.userId)
    if (isNaN(userId) || userId <= 0 || userId > 2147483647) {
      console.error('userId 无效:', friend.userId)
      notificationService.showNotification(`好友 ${friend.name || friend.nickname} 的ID格式错误`, 'error')
      return
    }

    // friendId 也应该是数字
    const friendId = parseInt(friend.friendId)
    if (isNaN(friendId) || friendId <= 0) {
      console.error('friendId 无效:', friend.friendId)
      notificationService.showNotification(`好友 ${friend.name || friend.nickname} 的关系ID无效`, 'error')
      return
    }

    form.members.push({
      userId: userId,                    // users 表的 id
      friendId: friendId,                 // friends 表的 id
      name: friend.name || friend.nickname || `用户${userId}`,
      avatar: friend.avatar,
      phone: friend.phone,                // 手机号仅用于显示
      amount: 0,
      isCreator: false
    })
  })

  showFriendSelector.value = false
}

// 移除成员 - 仅多人模式使用
const removeMember = (index) => {
  form.members.splice(index, 1)
  validateAmounts()
}

// 初始化表单（用于新增模式）
const initForm = () => {
  form.name = ''
  form.reason = ''
  form.targetAmount = ''
  form.currentAmount = ''
  form.deadline = getDefaultDeadline()
  form.type = '日常储蓄'
  form.members = []

  if (props.currentSavingsType === 'group') {
    ensureCreatorInMembers()
  }

  validationError.value = ''
}

// 重置表单
const resetForm = () => {
  initForm()
  emit('reset-form')
}

// 切换到新增模式
const resetToAdd = () => {
  resetForm()
}

// 提交表单
const submitForm = async () => {
  // 验证表单
  if (!form.name.trim()) {
    validationError.value = '请输入存钱目标名称'
    return
  }

  if (!form.targetAmount || form.targetAmount <= 0) {
    validationError.value = '请输入有效的目标金额'
    return
  }

  if (!form.deadline) {
    validationError.value = '请选择截止日期'
    return
  }

  // 多人模式：验证是否有成员
  if (props.currentSavingsType === 'group' && (!form.members || form.members.length === 0)) {
    validationError.value = '请至少添加一位成员'
    return
  }

  // 处理金额 - 个人模式
  let finalCurrentAmount = 0

  if (props.currentSavingsType === 'personal') {
    // 个人模式：使用输入的值
    if (props.isEditing) {
      finalCurrentAmount = form.currentAmount !== '' && form.currentAmount !== null
          ? Number(form.currentAmount)
          : Number(props.initialForm.currentAmount || 0)
    } else {
      finalCurrentAmount = form.currentAmount !== '' && form.currentAmount !== null
          ? Number(form.currentAmount)
          : 0
    }

    // 验证已存金额是否超过目标金额
    if (finalCurrentAmount > Number(form.targetAmount)) {
      validationError.value = '已存金额不能大于目标金额'
      return
    }
  }

  // 处理金额 - 多人模式
  let submitData = {}

  if (props.currentSavingsType === 'personal') {
    // 个人模式提交数据
    submitData = {
      name: form.name.trim(),
      reason: form.reason?.trim() || '',
      targetAmount: Number(form.targetAmount),
      currentAmount: finalCurrentAmount,
      deadline: form.deadline,
      type: form.type,
      icon: getIconByType(form.type),
      color: getColorByType(form.type),
      progress: calculateProgress(finalCurrentAmount, Number(form.targetAmount)),
      completed: finalCurrentAmount >= Number(form.targetAmount)
    }
  } else {
    // 多人模式提交数据
    const totalAmount = form.members.reduce((sum, member) => {
      return sum + (Number(member.amount) || 0)
    }, 0)

    // 验证总金额是否超过目标金额
    if (totalAmount > Number(form.targetAmount)) {
      validationError.value = '成员已存金额总和不能大于目标金额'
      return
    }

    submitData = {
      name: form.name.trim(),
      reason: form.reason?.trim() || '',
      targetAmount: Number(form.targetAmount),
      currentAmount: totalAmount,
      deadline: form.deadline,
      type: form.type,
      icon: getIconByType(form.type),
      color: getColorByType(form.type),
      progress: calculateProgress(totalAmount, Number(form.targetAmount)),
      completed: totalAmount >= Number(form.targetAmount),
      members: form.members.map(m => ({
        userId: m.userId,
        friendId: m.friendId,  // 添加 friendId
        name: m.name,
        avatar: m.avatar,
        amount: Number(m.amount) || 0,
        isCreator: m.isCreator || false
      }))
    }

    // 设置创建者ID
    const creator = form.members.find(m => m.isCreator)
    if (creator) {
      submitData.creatorId = creator.userId
      submitData.creatorName = creator.name
    }
  }

  // 验证通过，开始提交
  validationError.value = ''
  submitting.value = true

  try {
    let response

    if (props.isEditing) {
      // 编辑模式
      if (props.currentSavingsType === 'personal') {
        response = await savingService.updatePersonalSavings(props.editingId, submitData)
      } else {
        response = await savingService.updateGroupSavings(props.editingId, submitData)
      }

      if (response.code === 200) {
        notificationService.showNotification('计划更新成功', 'success')
        emit('submit-success', {
          ...submitData,
          id: props.editingId
        }, 'update')

        // 成功后重置表单
        resetForm()
      } else {
        notificationService.showNotification(response.message || '更新失败', 'error')
        return
      }
    } else {
      // 新增模式
      if (props.currentSavingsType === 'personal') {
        response = await savingService.createPersonalSavings(submitData)
      } else {
        response = await savingService.createGroupSavings(submitData)
      }

      if (response.code === 200 && response.data) {
        notificationService.showNotification('计划创建成功', 'success')

        // 构建完整的计划数据返回给父组件
        const planData = {
          ...submitData,
          id: response.data.id,
          // 确保包含后端返回的完整数据
          ...response.data
        }

        emit('submit-success', planData, 'create')

        // 成功后重置表单
        resetForm()
      } else {
        notificationService.showNotification(response.message || '创建失败', 'error')
        return
      }
    }

  } catch (error) {
    console.error('提交失败:', error)
    notificationService.showNotification('操作失败，请重试', 'error')
  } finally {
    submitting.value = false
  }
}

// 组件挂载时初始化
onMounted(() => {
  if (!props.isEditing) {
    initForm()
  }
})
</script>

<style scoped>
.add-savings-form {
  background-color: var(--white);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 25px;
  box-shadow: 0 5px 15px var(--shadow);
  scroll-margin-top: 20px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--primary-color);
}

.title-with-back {
  display: flex;
  align-items: center;
  gap: 10px;
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

.back-to-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background-color: var(--primary-color);
  border: none;
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 13px;
  color: var(--accent-color);
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.back-to-add-btn:hover {
  background-color: var(--secondary-color);
  transform: translateY(-2px);
}

.back-to-add-btn i {
  font-size: 14px;
  color: var(--accent-color);
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

.form-input:read-only,
.form-input:disabled {
  background-color: rgba(213, 235, 225, 0.3);
  cursor: not-allowed;
  color: var(--text-light);
}

.form-textarea {
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-row .form-group {
  flex: 1;
}

/* 输入提示 */
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

/* 成员管理区域 */
.members-section {
  margin-top: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 12px;
  border: 1px dashed var(--secondary-color);
}

.members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.members-header label {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-color);
  display: flex;
  align-items: center;
  gap: 6px;
}

.add-member-btn {
  background-color: var(--primary-color);
  border: none;
  border-radius: 20px;
  padding: 6px 15px;
  color: var(--accent-color);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
}

.add-member-btn:hover {
  background-color: var(--secondary-color);
  transform: translateY(-2px);
}

.add-member-btn i {
  font-size: 12px;
}

.members-list {
  max-height: 400px;
  overflow-y: auto;
}

.member-item-form {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: white;
  border-radius: 12px;
  margin-bottom: 10px;
  border: 1px solid var(--secondary-color);
  transition: all 0.3s;
}

.member-item-form:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
}

.member-item-form.creator-item {
  border-left: 4px solid #f39c12;
  background-color: rgba(243, 156, 18, 0.02);
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
  border: 2px solid white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.member-details {
  flex: 1;
  min-width: 0;
}

.member-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.member-name {
  font-weight: 600;
  color: var(--text-dark);
  font-size: 14px;
}

.creator-badge {
  font-size: 11px;
  color: #f39c12;
  background-color: rgba(243, 156, 18, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.creator-badge i {
  font-size: 10px;
}

.member-phone {
  font-size: 11px;
  color: var(--text-light);
  background-color: rgba(128, 164, 146, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
}

.member-amount-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-amount-row label {
  font-size: 12px;
  color: var(--text-light);
  white-space: nowrap;
}

.member-amount-input {
  width: 120px;
  padding: 6px 10px;
  border: 1px solid var(--secondary-color);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-dark);
  transition: all 0.3s;
}

.member-amount-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.1);
}

.remove-member-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background-color: #fee;
  color: #e74c3c;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  margin-left: 10px;
  flex-shrink: 0;
}

.remove-member-btn:hover {
  background-color: #e74c3c;
  color: white;
  transform: scale(1.1);
}

.no-members {
  text-align: center;
  padding: 30px 20px;
  color: var(--text-light);
  background-color: rgba(213, 235, 225, 0.05);
  border-radius: 12px;
}

.no-members i {
  font-size: 40px;
  color: var(--secondary-color);
  margin-bottom: 10px;
}

.no-members p {
  font-size: 14px;
  margin: 0;
}

/* 验证错误提示 */
.validation-error {
  background-color: #fee;
  color: #e74c3c;
  padding: 12px 15px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  border: 1px solid #fcc;
}

.validation-error i {
  font-size: 16px;
}

/* 表单操作按钮 */
.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
}

.btn {
  flex: 1;
  padding: 15px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--primary-color);
  color: var(--accent-color);
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--secondary-color);
}

.btn-secondary {
  background-color: rgba(128, 164, 146, 0.1);
  color: var(--accent-color);
}

.btn-secondary:hover:not(:disabled) {
  background-color: rgba(128, 164, 146, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .member-item-form {
    flex-wrap: wrap;
  }

  .member-amount-row {
    width: 100%;
    margin-top: 8px;
  }

  .member-amount-input {
    width: 100%;
  }

  .remove-member-btn {
    margin-left: auto;
  }
}

@media (max-width: 500px) {
  .members-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .add-member-btn {
    width: 100%;
    justify-content: center;
  }

  .member-name-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>