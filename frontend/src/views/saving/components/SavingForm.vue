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

          <!-- 成员列表 - 只显示未删除的成员 -->
          <div class="members-list" v-if="displayMembers.length > 0">
            <div
                v-for="(member, index) in displayMembers"
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
              :value="form.deadline"
              class="form-input"
              required
              placeholder="选择截止日期"
              readonly
              @click="openCustomDeadlinePicker"
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

    <!-- 好友选择器弹窗 -->
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
import groupSavingCacheService from '@/services/cache/group-saving-cache.service'

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
  members: [] // 仅在多人模式下使用，包含所有成员（包括已删除的）
})

// 好友选择器状态
const showFriendSelector = ref(false)
const selectedFriends = ref([])

// 提交状态
const submitting = ref(false)

// 验证错误
const validationError = ref('')

// 获取今天日期
const today = computed(() => {
  const date = new Date()
  return date.toISOString().split('T')[0]
})

// 已存金额的占位符文本（个人模式）
const currentAmountPlaceholder = computed(() => {
  return props.isEditing ? '当前已存金额' : '留空则默认为0'
})

// ========== 软删除相关计算属性 ==========
/**
 * 获取要显示的成员列表（过滤掉已删除的）
 */
const displayMembers = computed(() => {
  if (props.currentSavingsType !== 'group') return []
  return form.members.filter(m => m.deleted !== 1)
})

/**
 * 获取活跃成员列表（用于计算总金额）
 */
const activeMembers = computed(() => {
  if (props.currentSavingsType !== 'group') return []
  return form.members.filter(m => m.deleted !== 1)
})

/**
 * 计算总已存金额（只计算未删除的成员）
 */
const totalCurrentAmount = computed(() => {
  if (props.currentSavingsType !== 'group') return '0'
  const total = activeMembers.value.reduce((sum, member) => {
    const amount = Number(member.amount) || 0
    return sum + amount
  }, 0)
  return total.toLocaleString('zh-CN')
})

// 表单是否有效
const isFormValid = computed(() => {
  if (!form.targetAmount || form.targetAmount <= 0) return false
  if (!form.name.trim()) return false
  if (!form.deadline) return false

  if (props.currentSavingsType === 'personal') {
    if (form.currentAmount !== '' && form.currentAmount !== null) {
      const current = Number(form.currentAmount)
      const target = Number(form.targetAmount)
      if (current > target) return false
    }
    return true
  }

  if (props.currentSavingsType === 'group') {
    if (activeMembers.value.length === 0) return false
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
    form.name = newVal.name || ''
    form.reason = newVal.reason || ''
    form.targetAmount = newVal.targetAmount || ''
    form.deadline = newVal.deadline || getDefaultDeadline()
    form.type = newVal.type || '日常储蓄'

    if (props.currentSavingsType === 'personal') {
      form.currentAmount = newVal.currentAmount !== undefined ? newVal.currentAmount : ''
      form.members = []
    }

    if (props.currentSavingsType === 'group') {
      form.currentAmount = ''
      if (newVal.members) {
        // 保留所有成员（包括已删除的），确保金额正确加载
        form.members = newVal.members.map(m => ({
          ...m,
          amount: m.amount !== undefined && m.amount !== null ? m.amount : 0,
          deleted: m.deleted || 0,
          deletedAt: m.deletedAt || null
        }))
        ensureCreatorInMembers()
      } else {
        form.members = []
        ensureCreatorInMembers()
      }
    }
  }
}, {immediate: true, deep: true})

// 监听金额变化
watch(() => form.currentAmount, () => {
  if (props.currentSavingsType === 'personal') {
    validateAmounts()
  }
})

watch(() => form.targetAmount, () => {
  validateAmounts()
})

// 监听存钱类型变化
watch(() => props.currentSavingsType, (newType) => {
  if (newType === 'group' && !props.isEditing) {
    ensureCreatorInMembers()
  } else if (newType === 'personal') {
    form.members = []
  }
}, { immediate: true })

// 自定义截止日期选择器
const openCustomDeadlinePicker = async () => {
  const date = await notificationService.datePicker({
    title: '选择截止日期',
    defaultDate: form.deadline,
    minDate: today.value  // 不能选今天之前的日期
  });

  if (date) {
    form.deadline = date;
  }
};

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
    const total = activeMembers.value.reduce((sum, m) => sum + (Number(m.amount) || 0), 0)
    const target = Number(form.targetAmount) || 0
    if (target > 0 && total > target) {
      validationError.value = '成员已存金额总和不能大于目标金额'
    } else {
      validationError.value = ''
    }
  }
}

// 更新总金额
const updateTotalAmount = () => {
  validateAmounts()
}

/**
 * 确保创建者在成员列表中
 */
const ensureCreatorInMembers = () => {
  if (props.currentSavingsType !== 'group') return
  if (!props.currentUser || !props.currentUser.id) return

  const hasActiveCreator = activeMembers.value.some(m => m.isCreator)

  if (!hasActiveCreator) {
    const deletedCreator = form.members.find(m => m.isCreator && m.deleted === 1)
    if (deletedCreator) {
      console.log('【SavingForm】恢复已删除的创建者:', deletedCreator.name)
      deletedCreator.deleted = 0
      deletedCreator.deletedAt = null
      deletedCreator.userId = parseInt(props.currentUser.id)
      deletedCreator.name = props.currentUser.username || '我'
      deletedCreator.avatar = props.currentUser.avatar
    } else {
      console.log('【SavingForm】添加新的创建者:', props.currentUser.username || '我')
      const creatorMember = {
        userId: parseInt(props.currentUser.id),
        name: props.currentUser.username || '我',
        avatar: props.currentUser.avatar,
        amount: 0,
        isCreator: true,
        deleted: 0,
        deletedAt: null
      }
      form.members.unshift(creatorMember)
    }
  } else {
    const creator = form.members.find(m => m.isCreator)
    if (creator && creator.deleted === 1) {
      console.log('【SavingForm】修复创建者删除状态')
      creator.deleted = 0
      creator.deletedAt = null
    }
  }
}

/**
 * 打开好友选择器
 */
const openFriendSelector = () => {
  if (props.currentSavingsType !== 'group') return

  if (props.isEditing && form.members.length > 0) {
    selectedFriends.value = activeMembers.value
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

  showFriendSelector.value = true
}

/**
 * 处理好友确认选择
 */
const handleFriendConfirm = async (selected) => {
  console.log('从 FriendSelector 接收选中的好友:', selected)

  // 保存原有的创建者（从所有成员中找，包括已删除的）
  const existingCreator = form.members.find(m => m.isCreator)

  // 清空现有非创建者成员（只保留创建者）
  if (existingCreator) {
    form.members = [existingCreator]
    console.log('【SavingForm】保留创建者:', existingCreator.name, '金额:', existingCreator.amount)
  } else {
    form.members = []
  }

  // 添加选中的好友
  for (const friend of selected) {
    if (!friend.userId || !friend.friendId) {
      console.error('好友数据不完整:', friend)
      notificationService.showNotification(`好友 ${friend.nickname || friend.name} 信息不完整`, 'error')
      continue
    }

    const userId = parseInt(friend.userId)
    if (isNaN(userId) || userId <= 0 || userId > 2147483647) {
      console.error('userId 无效:', friend.userId)
      notificationService.showNotification(`好友 ${friend.nickname || friend.name} 的ID格式错误`, 'error')
      continue
    }

    const friendId = parseInt(friend.friendId)
    if (isNaN(friendId) || friendId <= 0) {
      console.error('friendId 无效:', friend.friendId)
      notificationService.showNotification(`好友 ${friend.nickname || friend.name} 的关系ID无效`, 'error')
      continue
    }

    // 关键：从 props.initialForm 中查找该成员是否存在（包括已删除的）
    // 因为 props.initialForm 是编辑时传入的原始数据，包含所有成员
    const existingMember = props.initialForm.members?.find(m => m.userId === userId)

    if (existingMember) {
      // 如果存在且是已删除的，恢复它
      if (existingMember.deleted === 1) {
        // 关键：恢复成员时，使用 existingMember.amount 中的值
        const realAmount = existingMember.amount !== undefined && existingMember.amount !== null ? existingMember.amount : 0

        console.log('【SavingForm】恢复已删除成员:', {
          userId,
          name: existingMember.name || existingMember.memberName,
          amount: realAmount,
          deleted: existingMember.deleted
        })

        form.members.push({
          userId: userId,
          friendId: friendId,
          name: existingMember.name || existingMember.memberName || friend.nickname || `用户${userId}`,
          avatar: existingMember.avatar || friend.avatar,
          phone: existingMember.phone || friend.phone,
          amount: realAmount,  // 使用原有的金额
          isCreator: existingMember.isCreator || false,
          deleted: 0,
          deletedAt: null
        })
      } else if (existingMember.deleted === 0) {
        // 如果成员已经存在且未删除，检查是否已在 form.members 中
        const alreadyInForm = form.members.some(m => m.userId === userId)
        if (!alreadyInForm) {
          form.members.push({
            ...existingMember,
            deleted: 0,
            deletedAt: null
          })
        }
      }
    } else {
      // 否则添加新成员，金额为0
      form.members.push({
        userId: userId,
        friendId: friendId,
        name: friend.nickname || friend.name || `用户${userId}`,
        avatar: friend.avatar,
        phone: friend.phone,
        amount: 0,
        isCreator: false,
        deleted: 0,
        deletedAt: null
      })
      console.log('【SavingForm】添加新成员:', friend.nickname || friend.name, '金额: 0')
    }
  }

  // 确保创建者仍然存在且状态正确
  if (existingCreator) {
    const currentCreator = form.members.find(m => m.isCreator)
    if (!currentCreator) {
      // 如果创建者被意外移除了，重新添加
      form.members.unshift(existingCreator)
      console.log('【SavingForm】创建者被意外移除，已重新添加')
    } else if (currentCreator.deleted === 1) {
      // 如果创建者被标记为删除，恢复它
      currentCreator.deleted = 0
      currentCreator.deletedAt = null
      console.log('【SavingForm】恢复被标记删除的创建者')
    }
  } else {
    // 如果没有创建者，确保有一个
    ensureCreatorInMembers()
  }

  // 重新验证金额
  validateAmounts()

  showFriendSelector.value = false
}

/**
 * 移除成员 - 软删除
 */
const removeMember = (index) => {
  const memberToRemove = displayMembers.value[index]

  if (memberToRemove.isCreator) {
    console.warn('【SavingForm】不能删除创建者')
    notificationService.showNotification('不能删除计划创建者', 'warning')
    return
  }

  const realIndex = form.members.findIndex(m =>
      m.userId === memberToRemove.userId &&
      m.isCreator === memberToRemove.isCreator
  )

  if (realIndex !== -1) {
    if (form.members[realIndex].deleted === 1) {
      console.log('【SavingForm】成员已经是删除状态，无需重复操作')
      return
    }

    const now = new Date().toISOString()
    form.members[realIndex].deleted = 1
    form.members[realIndex].deletedAt = now

    console.log('成员已标记为删除:', {
      userId: form.members[realIndex].userId,
      name: form.members[realIndex].name,
      deleted: form.members[realIndex].deleted,
      deletedAt: form.members[realIndex].deletedAt
    })
  }

  validateAmounts()
}

// 初始化表单
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

// ========== 提交表单 ==========
const submitForm = async () => {
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

  if (props.currentSavingsType === 'group') {
    ensureCreatorInMembers()
    if (activeMembers.value.length === 0) {
      validationError.value = '请至少添加一位成员'
      return
    }
  }

  let finalCurrentAmount = 0

  if (props.currentSavingsType === 'personal') {
    if (props.isEditing) {
      finalCurrentAmount = form.currentAmount !== '' && form.currentAmount !== null
          ? Number(form.currentAmount)
          : Number(props.initialForm.currentAmount || 0)
    } else {
      finalCurrentAmount = form.currentAmount !== '' && form.currentAmount !== null
          ? Number(form.currentAmount)
          : 0
    }

    if (finalCurrentAmount > Number(form.targetAmount)) {
      validationError.value = '已存金额不能大于目标金额'
      return
    }
  }

  let submitData = {}

  if (props.currentSavingsType === 'personal') {
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
    ensureCreatorInMembers()

    const hasCreator = activeMembers.value.some(m => m.isCreator)
    if (!hasCreator) {
      console.error('【SavingForm】提交时发现没有创建者，添加当前用户')
      const creatorMember = {
        userId: parseInt(props.currentUser.id),
        name: props.currentUser.username || '我',
        avatar: props.currentUser.avatar,
        amount: 0,
        isCreator: true,
        deleted: 0,
        deletedAt: null
      }
      form.members.unshift(creatorMember)
    }

    const creatorIndex = form.members.findIndex(m => m.isCreator)
    if (creatorIndex !== -1 && form.members[creatorIndex].deleted === 1) {
      console.log('【SavingForm】提交时发现创建者被标记为删除，恢复创建者')
      form.members[creatorIndex].deleted = 0
      form.members[creatorIndex].deletedAt = null
    }

    const totalAmount = activeMembers.value.reduce((sum, member) => {
      return sum + (Number(member.amount) || 0)
    }, 0)

    if (totalAmount > Number(form.targetAmount)) {
      validationError.value = '成员已存金额总和不能大于目标金额'
      return
    }

    const creator = form.members.find(m => m.isCreator)
    const now = new Date().toISOString()

    // 关键：发送所有成员（包括已删除的）给后端，确保金额正确传递
    submitData = {
      name: form.name.trim(),
      reason: form.reason?.trim() || '',
      description: form.reason?.trim() || '',
      targetAmount: Number(form.targetAmount),
      currentAmount: totalAmount,
      deadline: form.deadline,
      type: form.type,
      icon: getIconByType(form.type),
      color: getColorByType(form.type),
      progress: calculateProgress(totalAmount, Number(form.targetAmount)),
      completed: totalAmount >= Number(form.targetAmount),
      creatorId: creator ? creator.userId : parseInt(props.currentUser.id),
      members: form.members.map(m => ({
        userId: m.userId,
        name: m.name,
        amount: m.amount !== undefined && m.amount !== null ? Number(m.amount) : 0,
        isCreator: m.isCreator || false,
        deleted: m.deleted === 1 ? 1 : 0,
        deletedAt: m.deleted === 1 ? (m.deletedAt || now) : null
      }))
    }

    console.log('【SavingForm】多人模式提交数据:', {
      name: submitData.name,
      targetAmount: submitData.targetAmount,
      creatorId: submitData.creatorId,
      memberCount: submitData.members.length,
      members: submitData.members.map(m => ({
        name: m.name,
        isCreator: m.isCreator,
        amount: m.amount,
        deleted: m.deleted,
        deletedAt: m.deletedAt
      }))
    })
  }

  validationError.value = ''
  submitting.value = true

  try {
    let response

    if (props.isEditing) {
      if (props.currentSavingsType === 'personal') {
        response = await savingService.updatePersonalSavings(props.editingId, submitData)
      } else {
        response = await savingService.updateGroupSavings(props.editingId, submitData)
      }

      console.log('【SavingForm】编辑响应:', response)

      if (response && response.code === 200) {
        notificationService.showNotification('计划更新成功', 'success')
        emit('submit-success', {
          ...submitData,
          id: props.editingId
        }, 'update')
        resetForm()
      } else {
        const errorMsg = response?.message || response?.msg || '更新失败'
        notificationService.showNotification(errorMsg, 'error')
        return
      }
    } else {
      if (props.currentSavingsType === 'personal') {
        response = await savingService.createPersonalSavings(submitData)
      } else {
        console.log('【SavingForm】调用创建多人计划服务，数据:', submitData)
        response = await savingService.createGroupSavings(submitData)
      }

      console.log('【SavingForm】创建响应:', response)

      if (response && response.code === 200 && response.data) {
        notificationService.showNotification('计划创建成功', 'success')
        const planData = {
          ...submitData,
          id: response.data.id,
          ...response.data
        }
        emit('submit-success', planData, 'create')
        resetForm()
      } else {
        const errorMsg = response?.message || response?.msg || '创建失败'
        notificationService.showNotification(errorMsg, 'error')
        return
      }
    }

  } catch (error) {
    console.error('【SavingForm】提交失败:', error)

    if (error.response) {
      const status = error.response.status
      const errorMsg = error.response.data?.message || error.response.data?.msg || `请求失败 (${status})`
      notificationService.showNotification(errorMsg, 'error')
    } else if (error.request) {
      notificationService.showNotification('服务器无响应，请检查网络连接', 'error')
    } else if (error.message) {
      notificationService.showNotification(error.message, 'error')
    } else {
      notificationService.showNotification('操作失败，请重试', 'error')
    }
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
/* 样式保持不变，与之前相同 */
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