<template>
  <div class="not-found">
    <div class="container">
      <div class="error-code">404</div>
      <div class="error-title">页面不存在</div>
      <div class="error-message">
        抱歉，您访问的页面不存在或已被移除。
      </div>
      <div class="action-buttons">
        <button class="btn btn-primary" @click="goHome">
          <i class="fas fa-home"></i> 返回首页
        </button>
        <button class="btn btn-secondary" @click="goBack">
          <i class="fas fa-arrow-left"></i> 返回上一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/home')
}

const goBack = () => {
  router.go(-1)
}
</script>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 2rem;
  background-color: var(--primary-color);
}

.container {
  text-align: center;
  background-color: white;
  padding: 3rem;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
}

.error-code {
  font-size: 6rem;
  font-weight: bold;
  color: var(--error-color);
  line-height: 1;
  margin-bottom: 1rem;
}

.error-title {
  font-size: 2rem;
  color: var(--accent-color);
  margin-bottom: 1rem;
  font-weight: 600;
}

.error-message {
  font-size: 1.1rem;
  color: var(--text-light);
  margin-bottom: 2rem;
  line-height: 1.5;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.btn-primary {
  background-color: var(--accent-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--tertiary-color);
  transform: translateY(-2px);
}

.btn-secondary {
  background-color: var(--secondary-color);
  color: var(--text-dark);
}

.btn-secondary:hover {
  background-color: var(--primary-color);
  transform: translateY(-2px);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .container {
    padding: 2rem 1.5rem;
  }

  .error-code {
    font-size: 4rem;
  }

  .error-title {
    font-size: 1.5rem;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>