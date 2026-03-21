<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { authHelperService } from '@/services'
import { savingService } from '@/services'

onMounted(() => {
  // 应用启动时检查登录状态并初始化
  const token = authHelperService.getToken()
  const user = authHelperService.getCurrentUser()

  if (token && user?.id) {
    // 初始化 savingService
    savingService.setCurrentUser(user.id)
    console.log('【App】应用启动初始化 savingService，用户ID:', user.id)
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Arial', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>