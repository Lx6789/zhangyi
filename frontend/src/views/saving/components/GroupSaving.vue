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
        <div class="savings-content" @click="$emit('view-details', plan)">
          <div class="savings-icon" :style="{ backgroundColor: plan.color }">
            <i :class="plan.icon"></i>
          </div>
          <div class="savings-info">
            <h3>{{ plan.name }} <span class="member-count">({{ plan.members?.length || 0 }}人)</span></h3>
            <p>{{ plan.reason }}</p>
            <div class="savings-amount">已存 ¥{{ formatNumber(plan.currentAmount) }} / 目标 ¥{{ formatNumber(plan.targetAmount) }}</div>
            <div class="savings-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: plan.progress + '%' }"></div>
              </div>
              <div class="progress-text">
                <span>{{ plan.type }}</span>
                <span>{{ plan.progress }}%</span>
              </div>
            </div>

            <!-- 成员预览 -->
            <div class="members-preview" v-if="plan.members?.length > 0">
              <div v-for="(member, index) in plan.members.slice(0, 3)" :key="index" class="preview-avatar" :title="member.name">
                {{ member.avatar || member.name?.charAt(0) || '?' }}
              </div>
              <div v-if="plan.members.length > 3" class="preview-avatar more">+{{ plan.members.length - 3 }}</div>
            </div>
          </div>
        </div>

        <!-- 底部操作按钮区域 -->
        <div class="savings-actions">
          <!-- 存钱按钮（所有人都可见） -->
          <button class="savings-add-btn" @click.stop="$emit('add-money', plan)" title="存入金额">
            <i class="fas fa-plus-circle"></i>
            <span>存钱</span>
          </button>

          <!-- 退出按钮（所有人都可见） -->
          <button class="savings-leave-btn" @click.stop="$emit('leave', plan)" title="退出计划">
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
  </section>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

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

defineEmits(['edit', 'delete', 'view-details', 'add-money', 'leave'])

const isCreator = (plan) => plan.creatorId === props.currentUser?.id

const getPlanClass = (plan) => {
  if (plan.completed || plan.progress >= 100) return 'completed'
  if (plan.progress < 30) return 'warning'
  return ''
}

const formatNumber = (num) => num !== undefined && num !== null ? num.toLocaleString('zh-CN') : '0'
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

.savings-add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(128, 164, 146, 0.4);
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
}
</style>