<template>
  <div class="saving">
    <!-- 离线提示 -->
    <div v-if="!isOnline && currentSavingsType === 'group'" class="offline-banner">
      <i class="fas fa-wifi-slash"></i>
      <span>当前处于离线模式，多人存钱计划数据可能不可用</span>
    </div>

    <!-- 存钱类型选择 -->
    <div class="savings-type">
      <button
          v-for="type in savingsTypes"
          :key="type.value"
          class="type-btn"
          :class="{ active: currentSavingsType === type.value }"
          @click="switchSavingsType(type.value)"
      >
        <i :class="type.icon"></i>
        <span>{{ type.label }}</span>
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>加载中...</p>
    </div>

    <!-- 个人存钱计划 -->
    <PersonalSaving
        v-show="currentSavingsType === 'personal' && !loading"
        :personal-savings="personalSavings"
        :loading="loading"
        @edit="editPersonalPlan"
        @delete="confirmDeletePersonalPlan"
        @create="showPersonalForm"
        @update-plan="handleUpdatePlan"
    />

    <!-- 多人存钱计划 -->
    <GroupSaving
        v-show="currentSavingsType === 'group' && !loading"
        :group-savings="groupSavings"
        :is-online="isOnline"
        :current-user="currentUser"
        @edit="editGroupPlan"
        @delete="confirmDeletePlan"
        @view-details="viewPlanDetails"
        @update:group-savings="groupSavings = $event"
    />

    <!-- 新增/编辑表单 -->
    <SavingForm
        ref="formSection"
        :form-title="formTitle"
        :initial-form="form"
        :is-editing="isEditing"
        :is-editing-own-plan="isEditingOwnPlan"
        :current-savings-type="currentSavingsType"
        :current-user="currentUser"
        :editing-id="editingId"
        @submit-success="handleSubmitSuccess"
        @reset-form="resetForm"
    />

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirmModal" class="delete-confirm-modal" @click.self="showDeleteConfirmModal = false">
      <div class="delete-confirm-content">
        <div class="delete-confirm-header">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>确认删除</h3>
        </div>
        <div class="delete-confirm-body">
          <p>确定要删除存钱计划 <strong>"{{ planToDelete?.name }}"</strong> 吗？</p>
          <p class="warning-text">此操作不可撤销，所有相关数据将被永久删除。</p>
        </div>
        <div class="delete-confirm-footer">
          <button class="btn-cancel" @click="showDeleteConfirmModal = false">取消</button>
          <button class="btn-delete" @click="handleDeletePlan" :disabled="deleting">
            <i v-if="deleting" class="fas fa-spinner fa-spin"></i>
            <span v-else>确认删除</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'

// 导入子组件
import PersonalSaving from './components/PersonalSaving.vue'
import GroupSaving from './components/GroupSaving.vue'
import SavingForm from './components/SavingForm.vue'

// 导入服务
import { savingService, authService, authHelperService, notificationService } from '@/services'

const router = useRouter()

// ========== 状态定义 ==========
// 存钱类型选项
const savingsTypes = [
  { value: 'personal', label: '个人存钱', icon: 'fas fa-user' },
  { value: 'group', label: '多人存钱', icon: 'fas fa-users' }
]
const currentSavingsType = ref('personal')

// 表单标题
const formTitle = computed(() => {
  const type = currentSavingsType.value === 'personal' ? '个人' : '多人'
  return isEditing.value ? `编辑${type}存钱计划` : `新增${type}存钱计划`
})

// 编辑状态
const isEditing = ref(false)
const isEditingOwnPlan = ref(false)
const editingId = ref(null)
const editingType = ref(null)

// 提交状态
const submitting = ref(false)

// 删除相关
const showDeleteConfirmModal = ref(false)
const planToDelete = ref(null)
const deleting = ref(false)

// 表单区域引用
const formSection = ref(null)

// 表单数据（只作为数据容器，逻辑由 SavingForm 处理）
const form = reactive({
  name: '',
  reason: '',
  targetAmount: '',
  currentAmount: '',
  deadline: '',
  type: '日常储蓄',
  members: []
})

// 数据列表
const personalSavings = ref([])
const groupSavings = ref([])

// 加载状态
const loading = ref(false)

// 网络状态
const isOnline = ref(navigator.onLine)

// 当前用户信息
const currentUser = ref(null)

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

const formatNumber = (num) => num !== undefined && num !== null ? num.toLocaleString('zh-CN') : '0'

const getDefaultDeadline = () => {
  const today = new Date()
  const oneMonthLater = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
  return oneMonthLater.toISOString().split('T')[0]
}

const isCreator = (plan) => plan?.creatorId === currentUser.value?.id

const showNotification = (message, type = 'info') => {
  notificationService.showNotification(message, type)
}

// ========== 用户信息获取 ==========
const fetchCurrentUser = async () => {
  console.log('开始获取当前用户信息...')

  const token = authHelperService.getToken()
  const userFromStorage = authHelperService.getCurrentUser()

  console.log('Token:', token ? '存在' : '不存在')
  console.log('本地存储的用户信息:', userFromStorage)

  if (!token) {
    console.warn('用户未登录，准备跳转到登录页')
    authHelperService.redirectToLogin(router)
    return
  }

  if (userFromStorage && userFromStorage.id) {
    console.log('从本地存储获取用户信息成功，用户ID:', userFromStorage.id)
    currentUser.value = {
      id: userFromStorage.id,
      username: userFromStorage.username || userFromStorage.nickname || '用户',
      avatar: userFromStorage.avatar || '👤'
    }

    // 设置 savingService 的当前用户ID
    savingService.setCurrentUser(userFromStorage.id)
    console.log('【Saving】设置 savingService 用户ID:', userFromStorage.id)

    return
  }

  console.log('本地无用户信息，尝试从API获取...')
  await fetchUserInfoFromApi()
}

const fetchUserInfoFromApi = async () => {
  try {
    console.log('调用 getUserInfo API...')
    const response = await authService.getUserInfo()
    console.log('getUserInfo 响应:', response)

    if (response.code === 200 && response.data) {
      const userData = response.data
      console.log('获取用户信息成功:', userData)

      const userId = userData.id || userData.userId || userData.uid
      const username = userData.username || userData.nickname || userData.name || '用户'

      if (userId) {
        currentUser.value = {
          id: userId,
          username: username,
          avatar: userData.avatar || '👤'
        }

        authHelperService.saveAuthData(authHelperService.getToken(), {
          id: userId,
          username: username,
          avatar: userData.avatar
        })

        // 设置 savingService 的当前用户ID
        savingService.setCurrentUser(userId)
        console.log('【Saving-API】设置 savingService 用户ID:', userId)

        // 保存到 localStorage 备用
        localStorage.setItem('userId', userId)
      } else {
        console.error('API返回的用户数据中没有ID字段:', userData)
        showNotification('获取用户信息失败：数据格式错误', 'error')
      }
    } else {
      console.error('获取用户信息失败:', response?.message || '未知错误')
      showNotification('获取用户信息失败，请重新登录', 'error')
      setTimeout(() => {
        authHelperService.redirectToLogin(router)
      }, 1500)
    }
  } catch (error) {
    console.error('获取用户信息异常:', error)
    showNotification('获取用户信息失败: ' + (error.message || '网络错误'), 'error')
  }
}

// ========== 表单相关方法 ==========
const initForm = () => {
  Object.assign(form, {
    name: '',
    reason: '',
    targetAmount: '',
    currentAmount: '',
    deadline: getDefaultDeadline(),
    type: '日常储蓄',
    members: []
  })
}

const resetForm = () => {
  isEditing.value = false
  isEditingOwnPlan.value = false
  editingId.value = null
  editingType.value = null
  initForm()
}

/**
 * 滚动到表单位置
 */
const scrollToForm = async () => {
  await nextTick()
  if (formSection.value) {
    const element = formSection.value.$el
    const y = element.getBoundingClientRect().top + window.pageYOffset - 20
    window.scrollTo({
      top: y,
      behavior: 'smooth'
    })

    // 可选：添加高亮效果
    element.classList.add('form-highlight')
    setTimeout(() => {
      element.classList.remove('form-highlight')
    }, 1500)
  }
}

// ========== 处理表单提交成功 ==========
const handleSubmitSuccess = async (planData, action) => {
  if (action === 'create') {
    if (currentSavingsType.value === 'personal') {
      // 个人模式：直接添加到列表开头
      personalSavings.value.unshift(planData)
      showNotification('计划创建成功', 'success')
    } else {
      // 多人模式：强制刷新从服务器获取最新数据
      showNotification('计划创建成功，正在刷新列表...', 'info')
      await loadGroupSavings(true) // 传递 true 强制刷新
      showNotification('计划创建成功', 'success')
    }
  } else if (action === 'update') {
    if (currentSavingsType.value === 'personal') {
      // 个人模式：更新列表中的对应项
      const index = personalSavings.value.findIndex(p => p.id === planData.id)
      if (index !== -1) {
        personalSavings.value[index] = planData
      }
      showNotification('计划更新成功', 'success')
    } else {
      // 多人模式：强制刷新从服务器获取最新数据
      showNotification('计划更新成功，正在刷新列表...', 'info')
      await loadGroupSavings(true) // 传递 true 强制刷新
      showNotification('计划更新成功', 'success')
    }
  }

  // 重置编辑状态
  isEditing.value = false
  isEditingOwnPlan.value = false
  editingId.value = null
  editingType.value = null

  // 滚动到顶部
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// ========== 处理计划更新（来自存钱操作） ==========
const handleUpdatePlan = (updatedPlan) => {
  const index = personalSavings.value.findIndex(p => p.id === updatedPlan.id)
  if (index !== -1) {
    personalSavings.value[index] = updatedPlan
  }
}

// ========== 加载数据方法 ==========
const loadPersonalSavings = async () => {
  loading.value = true
  try {
    const response = await savingService.getPersonalSavingsList()
    if (response.code === 200) {
      personalSavings.value = response.data || []
      console.log('个人存钱计划加载成功，共', personalSavings.value.length, '条')
    } else {
      showNotification(response.message || '加载失败', 'error')
    }
  } catch (error) {
    console.error('加载个人存钱计划失败:', error)
    showNotification('加载失败: ' + error.message, 'error')
    personalSavings.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 加载多人存钱计划
 * @param {boolean} forceRefresh - 是否强制从服务器刷新
 */
const loadGroupSavings = async (forceRefresh = false) => {
  loading.value = true
  try {
    console.log(`加载多人存钱计划，强制刷新: ${forceRefresh}`)
    // 传递 forceRefresh 参数，强制从服务器获取最新数据
    const response = await savingService.getGroupSavingsList({}, forceRefresh)

    groupSavings.value = response.data || []

  } catch (error) {
    console.error('加载多人存钱计划失败:', error)
    groupSavings.value = []
  } finally {
    loading.value = false
  }
}

// ========== 切换存钱类型 ==========
const switchSavingsType = (type) => {
  currentSavingsType.value = type
  resetForm()
  if (type === 'group') {
    loadGroupSavings() // 切换时正常加载（可能使用缓存）
  } else {
    loadPersonalSavings()
  }
}

// ========== 显示个人表单 ==========
const showPersonalForm = () => {
  resetForm()
  scrollToForm()
}

// ========== 编辑计划 ==========
const editPersonalPlan = (plan) => {
  Object.assign(form, {
    name: plan.name,
    reason: plan.reason,
    targetAmount: plan.targetAmount,
    currentAmount: plan.currentAmount,
    deadline: plan.deadline,
    type: plan.type,
    members: []
  })

  isEditing.value = true
  isEditingOwnPlan.value = true
  editingId.value = plan.id
  editingType.value = 'personal'
  currentSavingsType.value = 'personal'

  // 滚动到表单
  scrollToForm()
}

const editGroupPlan = (plan) => {
  Object.assign(form, {
    name: plan.name,
    reason: plan.reason,
    targetAmount: plan.targetAmount,
    currentAmount: plan.currentAmount,
    deadline: plan.deadline,
    type: plan.type,
    members: plan.members ? plan.members.map(m => ({
      ...m,
      isCreator: m.userId === plan.creatorId,
      name: m.name || m.memberName,
      deleted: m.deleted || 0,
      deletedAt: m.deletedAt || null
    })) : []
  })

  isEditing.value = true
  isEditingOwnPlan.value = isCreator(plan)
  editingId.value = plan.id
  editingType.value = 'group'
  currentSavingsType.value = 'group'

  // 滚动到表单
  scrollToForm()
}

// ========== 删除计划 ==========
const confirmDeletePlan = (plan) => {
  planToDelete.value = plan
  showDeleteConfirmModal.value = true
}

const confirmDeletePersonalPlan = (plan) => {
  planToDelete.value = {
    ...plan,
    type: 'personal'
  }
  showDeleteConfirmModal.value = true
}

const handleDeletePlan = async () => {
  if (!planToDelete.value) return

  deleting.value = true

  try {
    if (planToDelete.value.type === 'personal') {
      const response = await savingService.deletePersonalSavings(planToDelete.value.id)

      if (response.code === 200) {
        const index = personalSavings.value.findIndex(p => p.id === planToDelete.value.id)
        if (index !== -1) {
          personalSavings.value.splice(index, 1)
        }
        showNotification('删除成功', 'success')
      } else {
        showNotification(response.message || '删除失败', 'error')
        return
      }
    } else {
      const response = await savingService.deleteGroupSavings(planToDelete.value.id)

      if (response.code === 200) {
        // 删除成功后强制刷新列表
        await loadGroupSavings(true)
        showNotification('删除成功', 'success')
      } else {
        showNotification(response.message || '删除失败', 'error')
        return
      }
    }

    showDeleteConfirmModal.value = false
    planToDelete.value = null

  } catch (error) {
    console.error('删除失败:', error)
    showNotification('删除失败: ' + error.message, 'error')
  } finally {
    deleting.value = false
  }
}

// ========== 计划详情处理 ==========
const viewPlanDetails = (plan) => {
  // 这个方法现在只是作为一个事件转发
  // 实际的详情逻辑在 GroupSaving 组件中处理
  console.log('查看计划详情:', plan)
}

// ========== 网络状态 ==========
const handleOnline = () => {
  isOnline.value = true
  showNotification('网络已连接', 'success')

  // 如果当前在多人模式，可以自动刷新数据
  if (currentSavingsType.value === 'group') {
    loadGroupSavings(true)
  }
}

const handleOffline = () => {
  isOnline.value = false
  showNotification('网络已断开，当前处于离线模式', 'warning')
}

// ========== 生命周期 ==========
onMounted(async () => {
  console.log('Saving组件挂载，开始初始化...')
  await fetchCurrentUser()
  initForm()
  await loadPersonalSavings()

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})

watch(() => currentUser.value, (newUser) => {
  console.log('当前用户信息更新:', newUser)
  if (newUser?.id) {
    // 如果用户信息变化，重新设置 savingService
    savingService.setCurrentUser(newUser.id)
    loadPersonalSavings()
  }
})
</script>

<style scoped>
/* 全局按钮样式重置 */
button {
  border: none;
  outline: none;
  background: none;
  cursor: pointer;
}

button:focus {
  outline: none;
  box-shadow: none;
}

/* 加载状态样式 */
.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-light);
  background-color: var(--white);
  border-radius: 20px;
  margin-bottom: 25px;
  box-shadow: 0 5px 15px var(--shadow);
}

.loading-state i {
  font-size: 40px;
  color: var(--accent-color);
  margin-bottom: 15px;
}

.loading-state p {
  font-size: 14px;
  color: var(--text-light);
}

/* 离线提示样式 */
.offline-banner {
  background-color: #fff3cd;
  color: #856404;
  padding: 10px 15px;
  border-radius: 10px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  border: 1px solid #ffeeba;
}

.offline-banner i {
  font-size: 16px;
}

/* 存钱类型选择 */
.savings-type {
  display: flex;
  margin-bottom: 20px;
  margin-top: 20px;
  background-color: var(--white);
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 3px 10px var(--shadow);
}

.type-btn {
  flex: 1;
  padding: 15px 5px;
  border: none;
  background: none;
  font-size: 15px;
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.type-btn.active {
  background-color: var(--primary-color);
  color: var(--accent-color);
  font-weight: 500;
}

.type-btn i {
  font-size: 20px;
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

/* 删除确认弹窗 */
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
  background-color: #fee;
  padding: 20px;
  text-align: center;
}

.delete-confirm-header i {
  font-size: 48px;
  color: #e74c3c;
  margin-bottom: 10px;
}

.delete-confirm-header h3 {
  font-size: 20px;
  color: #c0392b;
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

.btn-delete,
.btn-leave {
  padding: 10px 25px;
  border: none;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-delete {
  background-color: #e74c3c;
  color: white;
}

.btn-delete:hover:not(:disabled) {
  background-color: #c0392b;
  transform: translateY(-2px);
}

.btn-leave {
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
  color: white;
}

.btn-leave:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(243, 156, 18, 0.3);
}

.btn-delete:disabled,
.btn-leave:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 成员选择样式 */
.member-item.selected-member {
  background-color: rgba(243, 156, 18, 0.1);
  border: 2px solid #f39c12;
}

.member-checkbox {
  margin-left: 10px;
  display: flex;
  align-items: center;
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

/* 表单高亮动画 */
.form-highlight {
  animation: highlightPulse 1.5s ease;
}

@keyframes highlightPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(128, 164, 146, 0.7);
  }
  50% {
    box-shadow: 0 0 20px 10px rgba(128, 164, 146, 0.3);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(128, 164, 146, 0);
  }
}

@media (max-width: 768px) {
  .modal-footer {
    flex-direction: column;
  }

  .modal-footer button {
    width: 100%;
  }
}

@media (max-width: 500px) {
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