<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content saving-records-modal">
      <!-- 头部 -->
      <div class="modal-header">
        <div class="header-left">
          <i class="fas fa-piggy-bank" style="color: #80A492;"></i>
          <h3>存钱记录</h3>
        </div>
        <button class="modal-close" @click="handleClose">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- 标签页切换 -->
      <div class="record-tabs">
        <button
            class="tab-btn"
            :class="{ active: activeTab === 'personal' }"
            @click="switchTab('personal')"
        >
          <i class="fas fa-user"></i>
          <span>个人存钱记录</span>
        </button>
        <button
            class="tab-btn"
            :class="{ active: activeTab === 'group' }"
            @click="switchTab('group')"
        >
          <i class="fas fa-users"></i>
          <span>多人存钱记录</span>
        </button>
      </div>

      <!-- 个人存钱记录 -->
      <div v-if="activeTab === 'personal'" class="tab-content">
        <!-- 计划选择器 -->
        <div class="plan-selector">
          <select v-model="selectedPersonalPlanId" class="plan-select" @change="loadPersonalRecords">
            <option value="">请选择存钱计划</option>
            <option
                v-for="plan in personalPlans"
                :key="plan.id"
                :value="plan.id"
            >
              {{ plan.name }} (进度: {{ plan.progress }}%)
            </option>
          </select>
        </div>

        <!-- 个人记录列表 -->
        <div v-if="selectedPersonalPlanId" class="records-container">
          <div class="plan-summary" v-if="selectedPersonalPlan">
            <div class="plan-icon" :style="{ backgroundColor: selectedPersonalPlan.color }">
              <i :class="selectedPersonalPlan.icon"></i>
            </div>
            <div class="plan-info">
              <h4>{{ selectedPersonalPlan.name }}</h4>
              <p>{{ selectedPersonalPlan.reason }}</p>
              <div class="plan-stats">
                <span>目标: ¥{{ formatNumber(selectedPersonalPlan.targetAmount) }}</span>
                <span>已存: ¥{{ formatNumber(selectedPersonalPlan.currentAmount) }}</span>
                <span>进度: {{ selectedPersonalPlan.progress }}%</span>
              </div>
            </div>
          </div>

          <div class="records-list">
            <div v-if="loadingPersonal" class="loading-state">
              <i class="fas fa-spinner fa-spin"></i>
              <p>加载记录中...</p>
            </div>

            <div v-else-if="personalRecords.length === 0" class="empty-state">
              <i class="fas fa-coins"></i>
              <p>暂无存钱记录</p>
            </div>

            <div v-else class="records-list-content">
              <div
                  v-for="record in personalRecords"
                  :key="record.id"
                  class="record-card"
              >
                <div class="record-time">
                  <i class="far fa-clock"></i>
                  {{ formatDateTime(record.time) }}
                </div>
                <div class="record-amount positive">+¥{{ formatNumber(record.amount) }}</div>
                <div v-if="record.note" class="record-note">
                  备注: {{ record.note }}
                </div>
                <div class="record-balance">
                  余额: ¥{{ formatNumber(record.afterAmount) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <i class="fas fa-hand-pointer"></i>
          <p>请先选择一个存钱计划</p>
        </div>
      </div>

      <!-- 多人存钱记录 -->
      <div v-if="activeTab === 'group'" class="tab-content">
        <!-- 计划选择器 -->
        <div class="plan-selector">
          <select v-model="selectedGroupPlanId" class="plan-select" @change="loadGroupRecords">
            <option value="">请选择多人存钱计划</option>
            <option
                v-for="plan in groupPlans"
                :key="plan.id"
                :value="plan.id"
            >
              {{ plan.name }} ({{ plan.members?.length || 0 }}人 - {{ plan.progress }}%)
            </option>
          </select>
        </div>

        <!-- 成员选择器（当选择了计划后） -->
        <div v-if="selectedGroupPlanId && groupMembers.length > 0" class="member-selector">
          <select v-model="selectedMemberId" class="member-select" @change="loadGroupRecords">
            <option value="">全部成员</option>
            <option
                v-for="member in groupMembers"
                :key="member.userId"
                :value="member.userId"
            >
              {{ member.name }} {{ member.isCreator ? '(创建者)' : '' }}
            </option>
          </select>

          <!-- 日期筛选（可选） -->
          <div class="date-filter">
            <input
                type="date"
                v-model="dateRange.startTime"
                class="date-input"
                placeholder="开始日期"
                @change="loadGroupRecords"
            >
            <span class="date-separator">至</span>
            <input
                type="date"
                v-model="dateRange.endTime"
                class="date-input"
                placeholder="结束日期"
                @change="loadGroupRecords"
            >
          </div>
        </div>

        <!-- 多人记录列表 -->
        <div v-if="selectedGroupPlanId" class="records-container">
          <div class="plan-summary" v-if="selectedGroupPlan">
            <div class="plan-icon" :style="{ backgroundColor: selectedGroupPlan.color }">
              <i :class="selectedGroupPlan.icon"></i>
            </div>
            <div class="plan-info">
              <h4>{{ selectedGroupPlan.name }}</h4>
              <p>{{ selectedGroupPlan.reason }}</p>
              <div class="plan-stats">
                <span>目标: ¥{{ formatNumber(selectedGroupPlan.targetAmount) }}</span>
                <span>已存: ¥{{ formatNumber(selectedGroupPlan.currentAmount) }}</span>
                <span>进度: {{ selectedGroupPlan.progress }}%</span>
              </div>
            </div>
          </div>

          <div class="records-list">
            <div v-if="loadingGroup" class="loading-state">
              <i class="fas fa-spinner fa-spin"></i>
              <p>加载记录中...</p>
            </div>

            <div v-else-if="groupRecords.length === 0" class="empty-state">
              <i class="fas fa-coins"></i>
              <p>暂无存钱记录</p>
            </div>

            <div v-else class="records-list-content">
              <div
                  v-for="record in groupRecords"
                  :key="record.id"
                  class="record-card"
              >
                <div class="record-member">
                  <span class="member-badge" :style="{ backgroundColor: getMemberColor(record.memberId) + '20' }">
                    {{ record.memberName }}
                  </span>
                </div>
                <div class="record-time">
                  <i class="far fa-clock"></i>
                  {{ formatDateTime(record.depositTime || record.createTime) }}
                </div>
                <div class="record-amount positive">+¥{{ formatNumber(record.amount) }}</div>
                <div v-if="record.note" class="record-note">
                  备注: {{ record.note }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <i class="fas fa-hand-pointer"></i>
          <p>请先选择一个多人存钱计划</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import businessDataService from '@/services/business-data.service.js'
import savingService from '@/services/api/saving.service'
import { notificationService } from "@/services/index.js"
import authHelperService from '@/services/utils/auth-helper.service.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'close'])

// 当前用户
const currentUser = ref(null)

// 标签页状态
const activeTab = ref('personal')

// 个人存钱相关
const personalPlans = ref([])
const selectedPersonalPlanId = ref('')
const selectedPersonalPlan = computed(() => {
  return personalPlans.value.find(p => p.id === Number(selectedPersonalPlanId.value))
})
const personalRecords = ref([])
const loadingPersonal = ref(false)

// 多人存钱相关
const groupPlans = ref([])
const selectedGroupPlanId = ref('')
const selectedGroupPlan = computed(() => {
  return groupPlans.value.find(p => p.id === Number(selectedGroupPlanId.value))
})
const groupMembers = ref([])
const selectedMemberId = ref('')
const groupRecords = ref([])
const loadingGroup = ref(false)

// 日期范围筛选
const dateRange = reactive({
  startTime: '',
  endTime: ''
})

// 获取当前用户
const fetchCurrentUser = async () => {
  try {
    const basicUser = authHelperService.getCurrentUser()
    console.log('basicUser:', basicUser)

    if (!basicUser) {
      console.warn('没有找到用户信息')
      return
    }

    const response = await authApiService.getUserInfo()
    if (response && response.data) {
      currentUser.value = response.data
      console.log('获取到完整用户信息:', currentUser.value)
    } else {
      // 如果获取失败，使用 basicUser
      currentUser.value = {
        ...basicUser,
        id: basicUser.id || basicUser.userId,
        username: basicUser.username || basicUser.name
      }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    const basicUser = authHelperService.getCurrentUser()
    if (basicUser) {
      currentUser.value = {
        ...basicUser,
        id: basicUser.id || basicUser.userId,
        username: basicUser.username || basicUser.name
      }
    }
  }
}

// 加载个人存钱计划
const loadPersonalPlans = async () => {
  try {
    const plans = await businessDataService.getSavingsPlans('active')
    personalPlans.value = plans.map(plan => ({
      ...plan,
      progress: plan.targetAmount > 0 ? Math.round((plan.currentAmount / plan.targetAmount) * 100) : 0,
      icon: plan.icon || getIconByType(plan.type),
      color: plan.color || getColorByType(plan.type)
    }))
  } catch (error) {
    console.error('加载个人计划失败:', error)
  }
}

// 加载个人存钱记录
const loadPersonalRecords = async () => {
  if (!selectedPersonalPlanId.value) return

  loadingPersonal.value = true
  try {
    const planId = Number(selectedPersonalPlanId.value)
    const key = `personal_deposits_${planId}`
    const records = JSON.parse(localStorage.getItem(key) || '[]')

    // 按时间倒序排序
    personalRecords.value = records.sort((a, b) =>
        new Date(b.time) - new Date(a.time)
    )
  } catch (error) {
    console.error('加载个人存钱记录失败:', error)
    personalRecords.value = []
  } finally {
    loadingPersonal.value = false
  }
}

// 加载多人存钱计划
const loadGroupPlans = async () => {
  try {
    // 初始化缓存
    await groupSavingCache.init(currentUser.value?.id)

    let plans = []

    // 尝试从缓存获取
    plans = await groupSavingCache.getCachedGroupSavingsList()

    // 如果缓存没有，尝试从后端获取
    if (plans.length === 0 && navigator.onLine) {
      const response = await savingService.getGroupSavingsList()
      if (response && response.code === 200) {
        plans = response.data || []
        await groupSavingCache.cacheGroupSavingsList(plans)
      }
    }

    groupPlans.value = plans.map(plan => ({
      id: Number(plan.id),
      name: plan.name,
      reason: plan.description || plan.reason,
      targetAmount: plan.targetAmount,
      currentAmount: plan.currentAmount,
      deadline: plan.deadline,
      type: plan.type || '其他',
      icon: getIconByType(plan.type),
      color: getColorByType(plan.type),
      progress: plan.targetAmount > 0 ? Math.round((plan.currentAmount / plan.targetAmount) * 100) : 0,
      creatorId: Number(plan.creatorId || plan.createdBy),
      creatorName: plan.creatorName,
      members: plan.members || []
    }))
  } catch (error) {
    console.error('加载多人计划失败:', error)
  }
}

// 加载多人存钱记录（复用 saving.vue 的逻辑）
const loadGroupRecords = async () => {
  if (!selectedGroupPlanId.value) return

  loadingGroup.value = true
  try {
    const planId = Number(selectedGroupPlanId.value)

    // 构建查询参数
    const params = {
      page: 1,
      size: 100
    }

    if (selectedMemberId.value) {
      params.memberId = Number(selectedMemberId.value)
    }

    if (dateRange.startTime) {
      params.startTime = dateRange.startTime
    }
    if (dateRange.endTime) {
      params.endTime = dateRange.endTime
    }

    let records = []

    if (navigator.onLine) {
      // 在线模式：尝试从后端获取
      try {
        const response = await savingService.getPlanSavingRecordsByPost(planId, params)
        if (response.code === 200) {
          records = response.data || []

          // 缓存记录
          if (records.length > 0) {
            await groupSavingCache.cacheDepositRecords(records, planId)
          }
        }
      } catch (error) {
        console.warn('从后端获取失败，尝试从缓存获取:', error)
        // 失败时从缓存获取
        records = await loadGroupRecordsFromCache(planId)
      }
    } else {
      // 离线模式：从缓存获取
      records = await loadGroupRecordsFromCache(planId)
    }

    groupRecords.value = records

    // 加载成员列表（用于筛选）
    await loadGroupMembers(planId)

  } catch (error) {
    console.error('加载多人存钱记录失败:', error)
    groupRecords.value = []
  } finally {
    loadingGroup.value = false
  }
}

// 从缓存加载多人记录
const loadGroupRecordsFromCache = async (planId) => {
  try {
    const filters = {
      memberId: selectedMemberId.value || null,
      startTime: dateRange.startTime || null,
      endTime: dateRange.endTime || null
    }

    return await groupSavingCache.getCachedDepositRecordsByGroupId(planId, filters)
  } catch (error) {
    console.error('从缓存加载记录失败:', error)
    return []
  }
}

// 加载多人计划的成员列表
const loadGroupMembers = async (planId) => {
  try {
    const members = await groupSavingCache.getCachedMembersByGroupId(planId)
    groupMembers.value = members
  } catch (error) {
    console.error('加载成员列表失败:', error)
    groupMembers.value = []
  }
}

// 切换标签页
const switchTab = (tab) => {
  activeTab.value = tab
  // 重置选择
  if (tab === 'personal') {
    selectedGroupPlanId.value = ''
    selectedMemberId.value = ''
    dateRange.startTime = ''
    dateRange.endTime = ''
  } else {
    selectedPersonalPlanId.value = ''
    personalRecords.value = []
  }
}

// 监听计划选择变化
watch(selectedGroupPlanId, (newVal) => {
  if (newVal) {
    selectedMemberId.value = ''
    dateRange.startTime = ''
    dateRange.endTime = ''
    loadGroupRecords()
  } else {
    groupRecords.value = []
    groupMembers.value = []
  }
})

// 监听成员和日期变化
watch([selectedMemberId, () => dateRange.startTime, () => dateRange.endTime], () => {
  if (selectedGroupPlanId.value) {
    loadGroupRecords()
  }
})

// 初始化
onMounted(async () => {
  await fetchCurrentUser()
  if (currentUser.value) {
    await loadPersonalPlans()
    await loadGroupPlans()
  }
})

// 处理关闭
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

// 工具函数（复用 saving.vue 的）
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

const getMemberColor = (memberId) => {
  const colors = ['#2ecc71', '#3498db', '#9b59b6', '#f39c12', '#e74c3c', '#1abc9c']
  if (!memberId) return colors[0]
  const index = (memberId % colors.length)
  return colors[index]
}

const formatNumber = (num) => {
  return num !== undefined && num !== null ? num.toLocaleString('zh-CN') : '0'
}

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  const date = new Date(dateTimeStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.modal-overlay {
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

.modal-content {
  background-color: white;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.saving-records-modal {
  max-width: 800px !important;
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

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.header-left i {
  font-size: 24px;
  color: #80A492;
}

.header-left h3 {
  font-size: 20px;
  font-weight: 600;
  color: #80A492;
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

/* 标签页样式 */
.record-tabs {
  display: flex;
  gap: 5px;
  margin: 20px 25px;
  background: white;
  padding: 5px;
  border-radius: 30px;
  border: 1px solid #D5EBE1;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 25px;
  background: transparent;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab-btn.active {
  background: #D5EBE1;
  color: #80A492;
  font-weight: 500;
}

.tab-content {
  padding: 0 25px 25px;
}

/* 选择器样式 */
.plan-selector,
.member-selector {
  margin-bottom: 20px;
}

.plan-select,
.member-select {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 25px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  outline: none;
  transition: all 0.3s;
}

.plan-select:focus,
.member-select:focus {
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.date-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
}

.date-input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 25px;
  font-size: 14px;
  outline: none;
}

.date-separator {
  color: #999;
  font-size: 14px;
}

/* 计划摘要 */
.plan-summary {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: white;
  border-radius: 12px;
  border: 1px solid #D5EBE1;
}

.plan-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  flex-shrink: 0;
}

.plan-info {
  flex: 1;
}

.plan-info h4 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 5px 0;
}

.plan-info p {
  font-size: 13px;
  color: #666;
  margin: 0 0 8px 0;
}

.plan-stats {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #666;
  flex-wrap: wrap;
}

.plan-stats span {
  background: rgba(213, 235, 225, 0.3);
  padding: 4px 10px;
  border-radius: 20px;
}

/* 记录列表 */
.records-container {
  background: white;
  border-radius: 16px;
  border: 1px solid #D5EBE1;
  overflow: hidden;
}

.records-list {
  max-height: 400px;
  overflow-y: auto;
}

.records-list-content {
  padding: 15px;
}

.record-card {
  padding: 15px;
  border-bottom: 1px solid #D5EBE1;
  transition: all 0.3s;
}

.record-card:last-child {
  border-bottom: none;
}

.record-card:hover {
  background-color: rgba(213, 235, 225, 0.1);
}

.record-time {
  font-size: 13px;
  color: #666;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.record-amount {
  font-size: 18px;
  font-weight: 600;
  margin: 5px 0;
}

.record-amount.positive {
  color: #2ecc71;
}

.record-note {
  font-size: 12px;
  color: #999;
  margin: 5px 0;
  padding-left: 10px;
  border-left: 2px solid #D5EBE1;
}

.record-balance {
  font-size: 12px;
  color: #80A492;
  text-align: right;
}

.record-member {
  margin-bottom: 5px;
}

.member-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.loading-state i {
  font-size: 30px;
  color: #80A492;
  margin-bottom: 10px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-state i {
  font-size: 40px;
  color: #B1D5C8;
  margin-bottom: 10px;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

/* 响应式 */
@media (max-width: 600px) {
  .plan-stats {
    flex-direction: column;
    gap: 5px;
  }

  .date-filter {
    flex-direction: column;
  }

  .date-separator {
    display: none;
  }
}
</style>