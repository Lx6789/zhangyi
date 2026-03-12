<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay($event)">
    <div class="modal-content">
      <div class="modal-header">
        <i :class="icon"></i>
        <h3>{{ title }}</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="placeholder-content">
        <i class="fas fa-tools"></i>
        <p>{{ title }}功能开发中...</p>
        <p class="sub-text">敬请期待</p>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" @click="close">
          我知道了
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '功能开发中'
  }
})

const emit = defineEmits(['update:visible'])

const icon = computed(() => {
  const icons = {
    '采购管理': 'fas fa-truck',
    '价格管理': 'fas fa-tags',
    '成本核算': 'fas fa-calculator'
  }
  return icons[props.title] || 'fas fa-code-branch'
})

const close = () => {
  emit('update:visible', false)
}

const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}
</script>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.modal.active {
  opacity: 1;
  visibility: visible;
}

.modal-content {
  background-color: white;
  width: 90%;
  max-width: 400px;
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.modal-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #D5EBE1;
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
  text-align: left;
}

.modal-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 24px;
  color: #99BCAC;
  cursor: pointer;
}

.placeholder-content {
  padding: 40px 20px;
  text-align: center;
}

.placeholder-content i {
  font-size: 64px;
  color: #D5EBE1;
  margin-bottom: 20px;
}

.placeholder-content p {
  font-size: 18px;
  color: #333;
  margin-bottom: 10px;
}

.placeholder-content .sub-text {
  font-size: 14px;
  color: #999;
}

.form-actions {
  margin-top: 20px;
}

.btn {
  width: 100%;
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

.btn-primary {
  background-color: #D5EBE1;
  color: #80A492;
}

.btn-primary:hover {
  background-color: #B1D5C8;
}
</style>