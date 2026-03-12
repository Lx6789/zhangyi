<template>
  <div class="friend-selector-modal" @click.self="$emit('close')">
    <div class="friend-selector-content">
      <div class="friend-selector-header">
        <h3>选择好友</h3>
        <button class="close-btn" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="friend-selector-search">
        <i class="fas fa-search"></i>
        <input
            type="text"
            :value="friendSearchKeyword"
            @input="$emit('update:friend-search-keyword', $event.target.value)"
            placeholder="搜索好友..."
        >
      </div>

      <div class="friend-selector-list">
        <div v-if="loadingFriends" class="loading-friends">
          <i class="fas fa-spinner fa-spin"></i>
          <span>加载好友列表...</span>
        </div>

        <div v-else-if="filteredFriends.length === 0" class="no-friends">
          <i class="fas fa-user-friends"></i>
          <p>暂无好友可添加</p>
          <button class="btn-add-friend" @click="$emit('go-to-add-friend')">
            <i class="fas fa-user-plus"></i> 添加好友
          </button>
        </div>

        <div
            v-for="friend in filteredFriends"
            :key="friend.friendId"
            class="friend-selector-item"
            :class="{ selected: isFriendSelected(friend.friendId) }"
            @click="$emit('toggle-select', friend)"
        >
          <div class="friend-avatar">
            <img :src="friend.avatar || defaultAvatar" alt="avatar">
          </div>
          <div class="friend-info">
            <div class="friend-name">{{ friend.nickname }}</div>
            <div class="friend-phone">{{ friend.phone }}</div>
          </div>
          <div class="friend-checkbox">
            <i :class="isFriendSelected(friend.friendId) ? 'fas fa-check-circle' : 'far fa-circle'"></i>
          </div>
        </div>
      </div>

      <div class="friend-selector-footer">
        <div class="selected-count">已选择 {{ selectedFriends.length }} 位好友</div>
        <div class="footer-buttons">
          <button class="btn-cancel" @click="$emit('close')">取消</button>
          <button
              class="btn-confirm"
              @click="$emit('confirm')"
              :disabled="selectedFriends.length === 0"
          >
            确认添加 ({{ selectedFriends.length }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  friendsList: {
    type: Array,
    required: true
  },
  loadingFriends: {
    type: Boolean,
    required: true
  },
  selectedFriends: {
    type: Array,
    required: true
  },
  friendSearchKeyword: {
    type: String,
    required: true
  },
  filteredFriends: {
    type: Array,
    required: true
  }
})

defineEmits([
  'update:friend-search-keyword',
  'toggle-select',
  'confirm',
  'close',
  'go-to-add-friend'
])

const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'50\' fill=\'%23D5EBE1\'/%3E%3Ctext x=\'50\' y=\'70\' font-size=\'40\' text-anchor=\'middle\' fill=\'%232C3E50\'%3E👤%3C/text%3E%3C/svg%3E'

const isFriendSelected = (friendId) => {
  return props.selectedFriends.some(f => f.friendId === friendId)
}
</script>

<style scoped>
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
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.friend-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--primary-color);
}

.friend-selector-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-color);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-light);
  cursor: pointer;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.close-btn:hover {
  background-color: var(--primary-color);
  color: var(--accent-color);
}

.friend-selector-search {
  padding: 15px 20px;
  position: relative;
}

.friend-selector-search i {
  position: absolute;
  left: 35px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-light);
  font-size: 14px;
}

.friend-selector-search input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 1px solid var(--secondary-color);
  border-radius: 25px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
}

.friend-selector-search input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.friend-selector-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.loading-friends {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-light);
}

.loading-friends i {
  font-size: 30px;
  color: var(--accent-color);
  margin-bottom: 10px;
}

.no-friends {
  text-align: center;
  padding: 40px 20px;
}

.no-friends i {
  font-size: 50px;
  color: var(--secondary-color);
  margin-bottom: 10px;
}

.no-friends p {
  color: var(--text-light);
  margin-bottom: 15px;
}

.btn-add-friend {
  padding: 10px 20px;
  background-color: var(--primary-color);
  border: none;
  border-radius: 20px;
  color: var(--accent-color);
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.btn-add-friend:hover {
  background-color: var(--secondary-color);
}

.friend-selector-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background-color: rgba(213, 235, 225, 0.1);
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.friend-selector-item:hover {
  background-color: rgba(213, 235, 225, 0.3);
}

.friend-selector-item.selected {
  background-color: rgba(128, 164, 146, 0.1);
  border-color: var(--accent-color);
}

.friend-avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  border: 2px solid var(--primary-color);
}

.friend-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.friend-info {
  flex: 1;
}

.friend-name {
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 3px;
}

.friend-phone {
  font-size: 12px;
  color: var(--text-light);
}

.friend-checkbox {
  font-size: 20px;
  color: var(--accent-color);
  margin-left: 10px;
}

.fa-check-circle {
  color: var(--accent-color);
}

.fa-circle {
  color: var(--secondary-color);
}

.friend-selector-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--primary-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-count {
  font-size: 14px;
  color: var(--text-light);
}

.footer-buttons {
  display: flex;
  gap: 10px;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 20px;
  border: none;
  border-radius: 20px;
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
  background-color: var(--accent-color);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background-color: #6b8a7a;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 500px) {
  .friend-selector-content {
    max-width: 95%;
  }

  .friend-selector-footer {
    flex-direction: column;
    gap: 10px;
  }

  .selected-count {
    text-align: center;
  }

  .footer-buttons {
    width: 100%;
  }

  .btn-cancel,
  .btn-confirm {
    flex: 1;
  }
}
</style>