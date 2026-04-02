<template>
  <!-- 登录/注册卡片 -->
  <div class="auth-card">
    <div class="auth-header">
      <h2 class="auth-title">{{ isLoginMode ? '欢迎回来' : '创建账户' }}</h2>
      <p class="auth-subtitle">{{ isLoginMode ? '请登录您的账户继续使用' : '注册新账户开始使用' }}</p>
    </div>

    <!-- 登录/注册标签切换 -->
    <div class="auth-tabs">
      <button
          class="auth-tab"
          :class="{ active: isLoginMode }"
          @click="switchToLogin"
      >
        登录
      </button>
      <button
          class="auth-tab"
          :class="{ active: !isLoginMode }"
          @click="switchToRegister"
      >
        注册
      </button>
    </div>

    <!-- 登录表单 -->
    <form
        class="auth-form"
        v-if="isLoginMode"
        @submit.prevent="handleLogin"
    >
      <div class="form-group">
        <label for="loginEmail">手机号或邮箱</label>
        <i class="fas fa-user input-icon"></i>
        <input
            type="text"
            id="loginEmail"
            class="form-input"
            placeholder="请输入手机号或邮箱"
            v-model="loginForm.identifier"
            @input="clearError('loginEmailError')"
            required
        >
        <div class="error-message" v-if="errors.loginEmailError">
          <i class="fas fa-exclamation-circle"></i> <span>{{ errors.loginEmailError }}</span>
        </div>
      </div>

      <div class="form-group">
        <label for="loginPassword">密码</label>
        <i class="fas fa-lock input-icon"></i>
        <input
            :type="showLoginPassword ? 'text' : 'password'"
            id="loginPassword"
            class="form-input"
            placeholder="请输入密码"
            v-model="loginForm.password"
            @input="clearError('loginPasswordError')"
            autocomplete="new-password"
            required
        >
        <button
            type="button"
            class="password-toggle"
            @click="togglePassword('login')"
        >
          <i :class="showLoginPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
        </button>
        <div class="error-message" v-if="errors.loginPasswordError">
          <i class="fas fa-exclamation-circle"></i> <span>{{ errors.loginPasswordError }}</span>
        </div>
      </div>

      <div class="form-options">
        <div class="remember-me">
          <input
              type="checkbox"
              id="rememberMe"
              class="checkbox"
              v-model="loginForm.rememberMe"
          >
          <label for="rememberMe" class="checkbox-label">记住我</label>
        </div>
        <a href="#" class="forgot-password" @click.prevent="handleForgotPassword">
          忘记密码？
        </a>
      </div>

      <button
          type="submit"
          class="auth-button"
          :disabled="loginLoading"
      >
        <i :class="loginLoading ? 'fas fa-spinner fa-spin' : 'fas fa-sign-in-alt'"></i>
        {{ loginLoading ? '登录中...' : '登录' }}
      </button>

      <div class="social-login">
        <div class="divider">
          <span class="divider-text">或使用以下方式登录</span>
        </div>
        <div class="social-buttons">
          <button
              type="button"
              class="social-button wechat"
              @click="handleSocialLogin('wechat')"
          >
            <i class="fab fa-weixin"></i> 微信
          </button>
          <button
              type="button"
              class="social-button alipay"
              @click="handleSocialLogin('alipay')"
          >
            <i class="fab fa-alipay"></i> 支付宝
          </button>
        </div>
      </div>
    </form>

    <!-- 注册表单 -->
    <form
        class="auth-form"
        v-else
        @submit.prevent="handleRegister"
    >
      <div class="form-group">
        <label for="registerPhone">手机号</label>
        <i class="fas fa-phone input-icon"></i>
        <input
            type="tel"
            id="registerPhone"
            class="form-input"
            placeholder="请输入手机号"
            v-model="registerForm.phone"
            @input="clearError('registerPhoneError')"
            required
        >
        <div class="error-message" v-if="errors.registerPhoneError">
          <i class="fas fa-exclamation-circle"></i> <span>{{ errors.registerPhoneError }}</span>
        </div>
      </div>

      <!-- 图形验证码部分 -->
      <div class="form-group">
        <label for="captcha">图形验证码</label>
        <i class="fas fa-shield-alt input-icon"></i>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input
              type="text"
              id="captcha"
              class="form-input"
              placeholder="请输入图形验证码"
              style="flex: 1;"
              v-model="registerForm.captcha"
              @input="clearError('captchaError')"
              required
          >
          <div
              class="captcha-container"
              @click="refreshRegisterCaptcha"
              :style="{
              cursor: registerCaptcha?.loading ? 'wait' : 'pointer',
              opacity: registerCaptcha?.loading ? 0.7 : 1
            }"
          >
            <img
                v-if="registerCaptcha?.image"
                :src="registerCaptcha.image"
                alt="图形验证码"
                class="captcha-image"
            />
            <div v-else-if="registerCaptcha?.loading" class="captcha-loading">
              <i class="fas fa-spinner fa-spin"></i>
            </div>
            <div v-else class="captcha-placeholder">
              点击加载
            </div>
          </div>
        </div>
        <div class="error-message" v-if="errors.captchaError">
          <i class="fas fa-exclamation-circle"></i> <span>{{ errors.captchaError }}</span>
        </div>
      </div>

      <div class="form-group">
        <label for="registerPassword">登录密码</label>
        <i class="fas fa-lock input-icon"></i>
        <input
            :type="showRegisterPassword ? 'text' : 'password'"
            id="registerPassword"
            class="form-input"
            placeholder="请设置6-20位登录密码"
            v-model="registerForm.password"
            @input="clearError('registerPasswordError')"
            required
        >
        <button
            type="button"
            class="password-toggle"
            @click="togglePassword('register')"
        >
          <i :class="showRegisterPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
        </button>
        <div class="error-message" v-if="errors.registerPasswordError">
          <i class="fas fa-exclamation-circle"></i> <span>{{ errors.registerPasswordError }}</span>
        </div>
        <small class="hint-text">此密码用于登录验证，服务器会存储其哈希值</small>
      </div>

      <div class="form-group">
        <label for="registerConfirmPassword">确认登录密码</label>
        <i class="fas fa-lock input-icon"></i>
        <input
            :type="showRegisterConfirmPassword ? 'text' : 'password'"
            id="registerConfirmPassword"
            class="form-input"
            placeholder="请再次输入登录密码"
            v-model="registerForm.confirmPassword"
            @input="clearError('registerConfirmPasswordError')"
            required
        >
        <button
            type="button"
            class="password-toggle"
            @click="togglePassword('registerConfirm')"
        >
          <i :class="showRegisterConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
        </button>
        <div class="error-message" v-if="errors.registerConfirmPasswordError">
          <i class="fas fa-exclamation-circle"></i> <span>{{ errors.registerConfirmPasswordError }}</span>
        </div>
      </div>

      <div class="form-group">
        <label>安全提示问题（用于密码恢复）</label>
        <i class="fas fa-question-circle input-icon"></i>
        <input
            type="text"
            class="form-input"
            placeholder="例如：您小学的名字？"
            v-model="registerForm.securityQuestion"
            @input="clearError('securityQuestionError')"
            required
        >
        <div class="error-message" v-if="errors.securityQuestionError">
          <i class="fas fa-exclamation-circle"></i> <span>{{ errors.securityQuestionError }}</span>
        </div>
      </div>

      <div class="form-group">
        <label>安全提示答案</label>
        <i class="fas fa-key input-icon"></i>
        <input
            type="text"
            class="form-input"
            placeholder="请输入答案"
            v-model="registerForm.securityAnswer"
            @input="clearError('securityAnswerError')"
            autocomplete="off"
        >
        <div class="error-message" v-if="errors.securityAnswerError">
          <i class="fas fa-exclamation-circle"></i> <span>{{ errors.securityAnswerError }}</span>
        </div>
        <small class="hint-text">答案将加密存储，用于在您忘记密码时进行身份验证</small>
      </div>

      <div class="form-options">
        <div class="remember-me">
          <input
              type="checkbox"
              id="agreeTerms"
              class="checkbox"
              v-model="registerForm.agreeTerms"
              required
          >
          <label for="agreeTerms" class="checkbox-label">
            我已阅读并同意
            <a href="#" class="privacy-link" @click.prevent="showTermsModal">服务条款</a>
            和
            <a href="#" class="privacy-link" @click.prevent="showPrivacyModal">隐私政策</a>
          </label>
        </div>
      </div>

      <button
          type="submit"
          class="auth-button"
          :disabled="registerLoading"
      >
        <i :class="registerLoading ? 'fas fa-spinner fa-spin' : 'fas fa-user-plus'"></i>
        {{ registerLoading ? '注册中...' : '注册' }}
      </button>

      <div class="social-login">
        <div class="divider">
          <span class="divider-text">或使用以下方式注册</span>
        </div>
        <div class="social-buttons">
          <button
              type="button"
              class="social-button wechat"
              @click="handleSocialLogin('wechat')"
          >
            <i class="fab fa-weixin"></i> 微信
          </button>
          <button
              type="button"
              class="social-button alipay"
              @click="handleSocialLogin('alipay')"
          >
            <i class="fab fa-alipay"></i> 支付宝
          </button>
        </div>
      </div>
    </form>

    <div class="privacy-terms">
      登录/注册即表示您同意我们的
      <a href="#" class="privacy-link" @click.prevent="showTermsModal">服务条款</a>
      和
      <a href="#" class="privacy-link" @click.prevent="showPrivacyModal">隐私政策</a>
    </div>
  </div>

  <!-- 忘记密码弹窗 -->
  <div v-if="showForgotPasswordModal" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">重置密码</h3>
        <button class="modal-close" @click="closeForgotPasswordModal">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <!-- 步骤1：验证身份 -->
        <div v-if="forgotPasswordStep === 1" class="forgot-step">
          <p class="step-description">为了验证您的身份，请输入注册时使用的手机号</p>

          <div class="form-group">
            <label for="forgotPhone">手机号</label>
            <i class="fas fa-phone input-icon"></i>
            <input
                type="tel"
                id="forgotPhone"
                class="form-input"
                placeholder="请输入手机号"
                v-model="forgotPasswordForm.phone"
                @input="clearForgotError('phoneError')"
                :disabled="forgotPasswordLoading"
            >
            <div class="error-message" v-if="forgotPasswordErrors.phoneError">
              <i class="fas fa-exclamation-circle"></i>
              <span>{{ forgotPasswordErrors.phoneError }}</span>
            </div>
          </div>

          <!-- 图形验证码 -->
          <div class="form-group">
            <label for="forgotCaptcha">图形验证码</label>
            <i class="fas fa-shield-alt input-icon"></i>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input
                  type="text"
                  id="forgotCaptcha"
                  class="form-input"
                  placeholder="请输入图形验证码"
                  style="flex: 1;"
                  v-model="forgotPasswordForm.captcha"
                  @input="clearForgotError('captchaError')"
                  :disabled="forgotPasswordLoading"
              >
              <div
                  class="captcha-container"
                  @click="refreshForgotCaptcha"
                  :style="{
                  cursor: forgotPasswordLoading || forgotCaptcha?.loading ? 'not-allowed' : 'pointer',
                  opacity: forgotPasswordLoading ? 0.7 : 1
                }"
              >
                <img
                    v-if="forgotCaptcha?.image"
                    :src="forgotCaptcha.image"
                    alt="图形验证码"
                    class="captcha-image"
                />
                <div v-else-if="forgotCaptcha?.loading" class="captcha-loading">
                  <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div v-else class="captcha-placeholder">
                  点击加载
                </div>
              </div>
            </div>
            <div class="error-message" v-if="forgotPasswordErrors.captchaError">
              <i class="fas fa-exclamation-circle"></i>
              <span>{{ forgotPasswordErrors.captchaError }}</span>
            </div>
          </div>

          <button
              type="button"
              class="modal-button"
              @click="handleGetSecurityQuestion"
              :disabled="forgotPasswordLoading"
          >
            <i :class="forgotPasswordLoading ? 'fas fa-spinner fa-spin' : 'fas fa-arrow-right'"></i>
            {{ forgotPasswordLoading ? '验证中...' : '下一步' }}
          </button>
        </div>

        <!-- 步骤2：回答安全问题 -->
        <div v-if="forgotPasswordStep === 2" class="forgot-step">
          <p class="step-description">请回答以下安全问题以验证身份</p>

          <div class="security-question-box">
            <i class="fas fa-question-circle question-icon"></i>
            <p class="security-question">{{ securityQuestion }}</p>
          </div>

          <div class="form-group">
            <label for="securityAnswer">您的答案</label>
            <i class="fas fa-key input-icon"></i>
            <input
                type="text"
                id="securityAnswer"
                class="form-input"
                placeholder="请输入安全问题的答案"
                v-model="forgotPasswordForm.securityAnswer"
                @input="clearForgotError('securityAnswerError')"
                :disabled="verifyAnswerLoading"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                style="ime-mode: active;"
            >
            <div class="error-message" v-if="forgotPasswordErrors.securityAnswerError">
              <i class="fas fa-exclamation-circle"></i>
              <span>{{ forgotPasswordErrors.securityAnswerError }}</span>
            </div>
          </div>

          <div class="modal-buttons">
            <button
                type="button"
                class="modal-button secondary"
                @click="forgotPasswordStep = 1"
                :disabled="verifyAnswerLoading"
            >
              上一步
            </button>
            <button
                type="button"
                class="modal-button"
                @click="handleVerifySecurityAnswer"
                :disabled="verifyAnswerLoading"
            >
              <i :class="verifyAnswerLoading ? 'fas fa-spinner fa-spin' : 'fas fa-check'"></i>
              {{ verifyAnswerLoading ? '验证中...' : '验证' }}
            </button>
          </div>
        </div>

        <!-- 步骤3：重置密码 -->
        <div v-if="forgotPasswordStep === 3" class="forgot-step">
          <p class="step-description">身份验证成功！请设置新的登录密码</p>

          <div class="form-group">
            <label for="newPassword">新密码</label>
            <i class="fas fa-lock input-icon"></i>
            <input
                :type="showNewPassword ? 'text' : 'password'"
                id="newPassword"
                class="form-input"
                placeholder="请设置6-20位新密码"
                v-model="forgotPasswordForm.newPassword"
                @input="clearForgotError('newPasswordError')"
                :disabled="resetPasswordLoading"
            >
            <button
                type="button"
                class="password-toggle"
                @click="showNewPassword = !showNewPassword"
                :disabled="resetPasswordLoading"
            >
              <i :class="showNewPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
            <div class="error-message" v-if="forgotPasswordErrors.newPasswordError">
              <i class="fas fa-exclamation-circle"></i>
              <span>{{ forgotPasswordErrors.newPasswordError }}</span>
            </div>
          </div>

          <div class="form-group">
            <label for="confirmNewPassword">确认新密码</label>
            <i class="fas fa-lock input-icon"></i>
            <input
                :type="showConfirmNewPassword ? 'text' : 'password'"
                id="confirmNewPassword"
                class="form-input"
                placeholder="请再次输入新密码"
                v-model="forgotPasswordForm.confirmNewPassword"
                @input="clearForgotError('confirmNewPasswordError')"
                :disabled="resetPasswordLoading"
            >
            <button
                type="button"
                class="password-toggle"
                @click="showConfirmNewPassword = !showConfirmNewPassword"
                :disabled="resetPasswordLoading"
            >
              <i :class="showConfirmNewPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
            <div class="error-message" v-if="forgotPasswordErrors.confirmNewPasswordError">
              <i class="fas fa-exclamation-circle"></i>
              <span>{{ forgotPasswordErrors.confirmNewPasswordError }}</span>
            </div>
          </div>

          <div class="modal-buttons">
            <button
                type="button"
                class="modal-button secondary"
                @click="forgotPasswordStep = 2"
                :disabled="resetPasswordLoading"
            >
              上一步
            </button>
            <button
                type="button"
                class="modal-button"
                @click="handleResetPassword"
                :disabled="resetPasswordLoading"
            >
              <i :class="resetPasswordLoading ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i>
              {{ resetPasswordLoading ? '重置中...' : '重置密码' }}
            </button>
          </div>
        </div>

        <!-- 步骤4：重置成功 -->
        <div v-if="forgotPasswordStep === 4" class="forgot-step success-step">
          <div class="success-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <h4 class="success-title">密码重置成功！</h4>
          <p class="success-message">您的密码已成功重置，请使用新密码登录。</p>
          <button
              type="button"
              class="modal-button"
              @click="handleResetSuccess"
          >
            返回登录
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 服务条款弹窗 -->
  <div v-if="showTermsModalVisible" class="modal-overlay" @click="closeTermsModal">
    <div class="modal-content terms-modal" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">服务条款</h3>
        <button class="modal-close" @click="closeTermsModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body terms-body">
        <div class="terms-content">
          <h4>1. 服务说明</h4>
          <p>账易是一款个人记账管理工具，为您提供收入支出记录、存钱管理、生意记账等功能服务。使用本服务即表示您同意本条款。</p>

          <h4>2. 用户注册与账户安全</h4>
          <p>2.1 您需要注册账户才能使用本服务的完整功能。</p>
          <p>2.2 您应对您的账户信息（包括用户名、密码）保密，并对账户下的所有活动负责。</p>
          <p>2.3 如发现任何未经授权使用您账户的情况，请立即通知我们。</p>

          <h4>3. 用户行为规范</h4>
          <p>您承诺在使用本服务时遵守以下规范：</p>
          <p>3.1 不得利用本服务从事违法、违规活动；</p>
          <p>3.2 不得上传、传播虚假信息或侵犯他人权益的内容；</p>
          <p>3.3 不得试图干扰、破坏本服务的正常运行；</p>
          <p>3.4 不得进行任何可能对服务器造成损害的行为。</p>

          <h4>4. 数据存储与备份</h4>
          <p>4.1 我们会尽力保障您的数据安全，但建议您定期导出备份重要数据。</p>
          <p>4.2 如您连续12个月未登录账户，我们有权在提前通知后删除您的数据。</p>

          <h4>5. 服务变更与终止</h4>
          <p>5.1 我们有权根据业务发展需要调整、暂停或终止部分服务。</p>
          <p>5.2 如您违反本条款，我们有权立即终止您的账户使用权。</p>

          <h4>6. 免责声明</h4>
          <p>6.1 本服务按"现状"提供，不保证服务绝对无中断、无错误。</p>
          <p>6.2 因不可抗力导致的服务中断，我们不承担赔偿责任。</p>
          <p>6.3 您使用本服务所做的财务决策，风险由您自行承担。</p>

          <h4>7. 条款修改</h4>
          <p>我们可能会不时修改本条款，修改后的条款将在公布后生效。如您继续使用本服务，即视为同意修改后的条款。</p>

          <h4>8. 联系我们</h4>
          <p>如有疑问，请联系我们：support@zhangyi.com</p>

          <div class="terms-footer">
            <p>最后更新日期：2026年1月1日</p>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-button" @click="closeTermsModal">关闭</button>
      </div>
    </div>
  </div>

  <!-- 隐私政策弹窗 -->
  <div v-if="showPrivacyModalVisible" class="modal-overlay" @click="closePrivacyModal">
    <div class="modal-content privacy-modal" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">隐私政策</h3>
        <button class="modal-close" @click="closePrivacyModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body privacy-body">
        <div class="privacy-content">
          <h4>1. 我们收集的信息</h4>
          <p>1.1 您主动提供的信息：注册时提供的手机号、密码、安全问题和答案；使用过程中输入的收支记录、存钱记录、商品库存等数据。</p>
          <p>1.2 自动收集的信息：设备信息、IP地址、浏览器类型、访问时间等。</p>

          <h4>2. 信息的使用</h4>
          <p>2.1 提供、维护和改进我们的服务；</p>
          <p>2.2 保护您的账户安全，防止欺诈和滥用；</p>
          <p>2.3 向您发送服务通知和重要更新；</p>
          <p>2.4 分析使用情况以优化用户体验。</p>

          <h4>3. 信息的存储与保护</h4>
          <p>3.1 您的密码和安全答案采用加密方式存储，我们无法查看明文。</p>
          <p>3.2 您的记账数据存储在安全的数据库中，我们会采取合理的技术措施保护数据安全。</p>
          <p>3.3 尽管我们努力保护您的数据，但任何网络传输都无法保证100%安全。</p>

          <h4>4. 信息的分享</h4>
          <p>我们不会出售、交易或转让您的个人信息给第三方，以下情况除外：</p>
          <p>4.1 获得您的明确同意；</p>
          <p>4.2 法律法规要求；</p>
          <p>4.3 为保护账易、用户或公众的权利、财产或安全。</p>

          <h4>5. 您的权利</h4>
          <p>5.1 您有权访问、更正、删除您的个人信息；</p>
          <p>5.2 您有权导出您的记账数据；</p>
          <p>5.3 您有权注销账户，注销后您的数据将被永久删除。</p>

          <h4>6. Cookie 和类似技术</h4>
          <p>我们使用Cookie来记住您的登录状态和偏好设置。您可以通过浏览器设置管理Cookie。</p>

          <h4>7. 未成年人隐私</h4>
          <p>本服务不面向14岁以下未成年人。如发现未成年人提供了个人信息，我们将及时删除。</p>

          <h4>8. 隐私政策的变更</h4>
          <p>我们可能会不时更新本隐私政策，变更内容将在本页面公布。重大变更会通过弹窗或邮件通知您。</p>

          <h4>9. 联系我们</h4>
          <p>如有隐私相关问题，请联系：privacy@zhangyi.com</p>

          <div class="privacy-footer">
            <p>最后更新日期：2026年1月1日</p>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-button" @click="closePrivacyModal">关闭</button>
      </div>
    </div>
  </div>
</template>

<script>
// 修正导入路径 - 根据实际项目结构调整
import {
  authService,
  authHelperService,
  notificationService,
} from '@/services'

import validationService from "@/services/utils/validation.service.js";

// 单独导入formHelperService和captchaHelperService
import formHelperService from '@/services/utils/form-helper.service'
import captchaHelperService from '@/services/utils/captcha-helper.service'
// 导入数据初始化服务
import initDataService from '@/services/init-data.service.js'

export default {
  name: 'LoginPage',
  data() {
    return {
      isLoginMode: true,
      showLoginPassword: false,
      showRegisterPassword: false,
      showRegisterConfirmPassword: false,
      showSecurityAnswer: false,

      // 忘记密码相关数据
      showForgotPasswordModal: false,
      forgotPasswordStep: 1,
      showNewPassword: false,
      showConfirmNewPassword: false,
      securityQuestion: '',

      // 服务条款和隐私政策弹窗
      showTermsModalVisible: false,
      showPrivacyModalVisible: false,

      // 登录表单数据
      loginForm: {
        identifier: '',
        password: '',
        rememberMe: false
      },

      // 注册表单数据
      registerForm: {
        phone: '',
        captcha: '',
        password: '',
        confirmPassword: '',
        securityQuestion: '',
        securityAnswer: '',
        agreeTerms: false
      },

      // 忘记密码表单
      forgotPasswordForm: {
        phone: '',
        captcha: '',
        securityAnswer: '',
        newPassword: '',
        confirmNewPassword: ''
      },

      // 忘记密码错误信息
      forgotPasswordErrors: {
        phoneError: '',
        captchaError: '',
        securityAnswerError: '',
        newPasswordError: '',
        confirmNewPasswordError: ''
      },

      // 错误信息
      errors: {
        loginEmailError: '',
        loginPasswordError: '',
        registerPhoneError: '',
        captchaError: '',
        registerPasswordError: '',
        registerConfirmPasswordError: '',
        securityQuestionError: '',
        securityAnswerError: ''
      },

      // 验证码管理器
      registerCaptcha: null,
      forgotCaptcha: null,

      // 加载状态
      loginLoading: false,
      registerLoading: false,
      forgotPasswordLoading: false,
      verifyAnswerLoading: false,
      resetPasswordLoading: false
    }
  },

  computed: {
    // 是否已登录
    isAuthenticated() {
      return authHelperService.isAuthenticated()
    }
  },

  created() {
    // 初始化验证码管理器
    this.registerCaptcha = captchaHelperService.createManager({
      autoLoad: false,
      onLoaded: () => {
        console.log('注册验证码加载完成')
      },
      onError: (error) => {
        console.error('注册验证码加载失败:', error)
      }
    })

    this.forgotCaptcha = captchaHelperService.createManager({
      autoLoad: false, // 不自动加载，等弹窗打开后再加载
      onLoaded: () => {
        console.log('忘记密码验证码加载完成')
      },
      onError: (error) => {
        console.error('忘记密码验证码加载失败:', error)
      }
    })
  },

  mounted() {
    // 检查记住的邮箱
    const rememberedEmail = localStorage.getItem('rememberedEmail')
    if (rememberedEmail) {
      this.loginForm.identifier = rememberedEmail
      this.loginForm.rememberMe = true
    }

    // 如果已登录，重定向到首页
    if (this.isAuthenticated && this.$route.path.includes('/login')) {
      console.log('已登录，重定向到首页')
      this.$router.replace('/')
    }
  },

  methods: {
    // ==================== 通用方法 ====================

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
      notificationService.showNotification(message, type)
    },

    /**
     * 清除错误
     */
    clearError(field) {
      if (this.errors[field] !== undefined) {
        this.errors[field] = ''
      }
    },

    /**
     * 清除忘记密码错误
     */
    clearForgotError(field) {
      if (this.forgotPasswordErrors[field] !== undefined) {
        this.forgotPasswordErrors[field] = ''
      }
    },

    /**
     * 切换密码显示状态
     */
    togglePassword(type) {
      switch (type) {
        case 'login':
          this.showLoginPassword = !this.showLoginPassword
          break
        case 'register':
          this.showRegisterPassword = !this.showRegisterPassword
          break
        case 'registerConfirm':
          this.showRegisterConfirmPassword = !this.showRegisterConfirmPassword
          break
      }
    },

    /**
     * 切换安全问题答案显示状态（新增）
     */
    toggleSecurityAnswer() {
      this.showSecurityAnswer = !this.showSecurityAnswer
    },

    // ==================== 弹窗相关 ====================

    /**
     * 显示服务条款弹窗
     */
    showTermsModal() {
      this.showTermsModalVisible = true
    },

    /**
     * 关闭服务条款弹窗
     */
    closeTermsModal() {
      this.showTermsModalVisible = false
    },

    /**
     * 显示隐私政策弹窗
     */
    showPrivacyModal() {
      this.showPrivacyModalVisible = true
    },

    /**
     * 关闭隐私政策弹窗
     */
    closePrivacyModal() {
      this.showPrivacyModalVisible = false
    },

    // ==================== 模式切换 ====================

    /**
     * 切换到登录模式
     */
    switchToLogin() {
      this.isLoginMode = true
      formHelperService.clearForm(this.errors)
      formHelperService.clearForm(this.loginForm)
    },

    /**
     * 切换到注册模式
     */
    async switchToRegister() {
      this.isLoginMode = false
      formHelperService.clearForm(this.errors)
      formHelperService.clearForm(this.registerForm)
      // 加载注册验证码
      if (this.registerCaptcha) {
        await this.$nextTick()
        try {
          this.registerCaptcha.clear()
          await this.registerCaptcha.load()
        } catch (error) {
          console.error('加载注册验证码失败:', error)
          this.showNotification('验证码加载失败，请重试', 'error')
        }
      }
    },

    // ==================== 验证码相关 ====================

    /**
     * 刷新注册验证码
     */
    async refreshRegisterCaptcha() {
      if (this.registerCaptcha?.loading) {
        console.log('验证码正在加载中，请稍候...')
        return
      }

      this.registerForm.captcha = ''
      this.clearError('captchaError')

      try {
        await this.registerCaptcha.refresh()
      } catch (error) {
        console.error('刷新注册验证码失败:', error)
        this.showNotification('刷新验证码失败，请重试', 'error')
      }
    },

    /**
     * 刷新忘记密码验证码
     */
    async refreshForgotCaptcha() {
      // 只检查验证码是否正在加载
      if (this.forgotCaptcha?.loading) {
        console.log('验证码正在加载中，请稍候...')
        return false
      }

      console.log('开始刷新验证码...')

      // 清空验证码输入框
      this.forgotPasswordForm.captcha = ''
      this.clearForgotError('captchaError')

      try {
        await this.forgotCaptcha.refresh()
        console.log('验证码刷新成功，新验证码key:', this.forgotCaptcha.key)
        return true
      } catch (error) {
        console.error('刷新忘记密码验证码失败:', error)
        this.showNotification('刷新验证码失败，请重试', 'error')
        return false
      }
    },

    // ==================== 登录相关 ====================

    /**
     * 处理登录
     */
    async handleLogin() {
      const {identifier, password, rememberMe} = this.loginForm

      // 验证表单
      if (!this.validateLoginForm()) {
        return
      }

      this.loginLoading = true

      try {
        // 调用登录API
        const response = await authService.login({
          identifier,
          password,
          rememberMe
        })

        console.log('登录响应:', response)

        // 从响应中提取数据（兼容不同结构）
        const responseData = response.data || response
        const token = responseData.token
        const user = responseData.user

        if (token) {
          // 保存认证信息
          authHelperService.saveAuthData(token, user)

          // 同时保存一份到旧的键名，兼容现有代码
          localStorage.setItem('token', token)

          // ✅ 关键修复：设置 savingService 的当前用户ID
          const userId = user?.id || responseData.userId
          if (userId) {
            // 动态导入 savingService 避免循环依赖
            import('@/services/api/saving.service').then(module => {
              const savingService = module.default
              savingService.setCurrentUser(userId)
              console.log('【登录】设置 savingService 用户ID:', userId)
            }).catch(err => {
              console.error('【登录】导入 savingService 失败:', err)
            })

            // 也保存到 localStorage 备用
            localStorage.setItem('userId', userId)

            // ==================== 🔥 登录成功后初始化数据库 ====================
            console.log('【登录】开始初始化数据库...')

            try {
              // 调用数据库初始化服务，静默模式（不显示通知）
              const initResult = await initDataService.initAllTables(userId, {
                forceRefresh: false,  // 不强制刷新，只初始化空表
                silent: true          // 静默模式，不显示通知
              })

              if (initResult.success) {
                console.log('【登录】数据库初始化成功:', {
                  总表数: initResult.tables ? Object.keys(initResult.tables).length : 0,
                  成功表数: initResult.tables ? Object.keys(initResult.tables).filter(k => initResult.tables[k]?.success).length : 0,
                  耗时: initResult.duration + 'ms'
                })

                // ✅ 修复：添加空值检查
                if (initResult.tables) {
                  // 打印各表初始化详情
                  Object.keys(initResult.tables).forEach(tableName => {
                    const result = initResult.tables[tableName]
                    if (result.skipped) {
                      console.log(`  - ${tableName}: 跳过 (${result.message})`)
                    } else if (result.success) {
                      console.log(`  - ${tableName}: 成功 (${result.dataCount} 条数据)`)
                    } else {
                      console.warn(`  - ${tableName}: 失败 - ${result.error}`)
                    }
                  })
                }
              } else {
                console.warn('【登录】部分数据库初始化失败:', initResult.errors || [])
              }
            } catch (error) {
              console.error('【登录】数据库初始化异常:', error)
              // 数据库初始化失败不影响登录流程
            }
            // ==================== 数据初始化结束 ====================
          }

          // 记住我功能
          if (rememberMe) {
            localStorage.setItem('rememberedEmail', identifier)
          } else {
            localStorage.removeItem('rememberedEmail')
          }

          this.showNotification('登录成功！', 'success')

          // 处理重定向
          setTimeout(() => {
            const queryParams = new URLSearchParams(window.location.search)
            let redirect = queryParams.get('redirect') || localStorage.getItem('redirectAfterLogin')

            if (redirect) {
              localStorage.removeItem('redirectAfterLogin')
              try {
                redirect = decodeURIComponent(redirect)
                console.log('重定向到:', redirect)
                this.$router.replace(redirect)
              } catch (e) {
                console.warn('重定向路径解码失败:', e)
                this.$router.replace('/')
              }
            } else {
              this.$router.replace('/')
            }
          }, 1000)
        } else {
          this.setFormError('loginPasswordError', '登录失败，请检查凭证')
        }
      } catch (error) {
        console.error('登录异常:', error)
        let errorMessage = '网络错误，请稍后重试'
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.message) {
          errorMessage = error.message
        }
        this.setFormError('loginPasswordError', errorMessage)
      } finally {
        this.loginLoading = false
      }
    },

    /**
     * 验证登录表单
     */
    validateLoginForm() {
      const {identifier, password} = this.loginForm

      this.clearAllErrors()

      if (!identifier) {
        this.setFormError('loginEmailError', '请输入手机号或邮箱')
        return false
      }

      if (!validationService.isValidEmailOrPhone(identifier)) {
        this.setFormError('loginEmailError', '请输入正确的手机号或邮箱')
        return false
      }

      if (!password) {
        this.setFormError('loginPasswordError', '请输入密码')
        return false
      }

      if (!validationService.isValidPassword(password)) {
        this.setFormError('loginPasswordError', '密码至少6位')
        return false
      }

      return true
    },

    /**
     * 登录错误处理
     */
    handleLoginError(error) {
      let errorMessage = '网络错误，请稍后重试'

      // 根据错误响应处理
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      this.setFormError('loginPasswordError', errorMessage)
    },

    // ==================== 注册相关 ====================

    /**
     * 处理注册
     */
    async handleRegister() {
      if (!this.validateRegisterForm()) {
        return
      }

      // 验证验证码
      if (!this.registerForm.captcha) {
        this.setFormError('captchaError', '请输入图形验证码')
        return
      }

      if (!this.registerCaptcha?.key) {
        this.setFormError('captchaError', '验证码已失效，请刷新重试')
        this.registerCaptcha.refresh()
        return
      }

      this.registerLoading = true

      try {
        const response = await authService.register({
          phone: this.registerForm.phone,
          password: this.registerForm.password,
          captchaKey: this.registerCaptcha.key,
          captchaCode: this.registerForm.captcha,
          securityQuestion: this.registerForm.securityQuestion,
          securityAnswer: this.registerForm.securityAnswer
        })

        this.handleRegisterSuccess(response)

      } catch (error) {
        this.handleRegisterException(error)
      } finally {
        this.registerLoading = false
      }
    },

    /**
     * 验证注册表单
     */
    validateRegisterForm() {
      const {phone, password, confirmPassword, securityQuestion, securityAnswer, agreeTerms} = this.registerForm

      this.clearAllErrors()

      // 验证手机号
      if (!phone) {
        this.setFormError('registerPhoneError', '请输入手机号')
        return false
      }

      if (!validationService.isValidPhone(phone)) {
        this.setFormError('registerPhoneError', '请输入正确的手机号')
        return false
      }

      // 验证密码
      if (!validationService.isValidPassword(password)) {
        this.setFormError('registerPasswordError', '密码需6-20位')
        return false
      }

      // 验证确认密码
      if (!validationService.isPasswordMatch(password, confirmPassword)) {
        this.setFormError('registerConfirmPasswordError', '两次输入的密码不一致')
        return false
      }

      // 验证安全问题
      if (!securityQuestion?.trim()) {
        this.setFormError('securityQuestionError', '请输入安全提示问题')
        return false
      }

      if (!securityAnswer?.trim()) {
        this.setFormError('securityAnswerError', '请输入安全提示答案')
        return false
      }

      // 验证服务条款
      if (!agreeTerms) {
        this.showNotification('请阅读并同意服务条款和隐私政策', 'error')
        return false
      }

      return true
    },

    /**
     * 注册成功处理
     */
    handleRegisterSuccess(response) {
      this.showNotification('注册成功！请登录', 'success')

      if (this.registerCaptcha) {
        this.registerCaptcha.clear()
      }

      // 切换到登录模式
      this.switchToLogin()
    },

    /**
     * 注册异常处理
     */
    handleRegisterException(error) {
      let errorMessage = '网络错误，请稍后重试'

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message

        // 根据错误信息设置对应的字段错误
        if (errorMessage.includes('手机号') || errorMessage.includes('已注册')) {
          this.setFormError('registerPhoneError', errorMessage)
        } else if (errorMessage.includes('验证码')) {
          this.setFormError('captchaError', errorMessage)
        } else {
          this.showNotification(errorMessage, 'error')
        }
      } else {
        this.showNotification(errorMessage, 'error')
      }

      // 刷新验证码
      if (this.registerCaptcha) {
        this.registerCaptcha.refresh()
      }
    },

    /**
     * 重置注册表单
     */
    resetRegisterForm() {
      this.registerForm = {
        phone: '',
        captcha: '',
        password: '',
        confirmPassword: '',
        securityQuestion: '',
        securityAnswer: '',
        agreeTerms: false
      }
      if (this.registerCaptcha) {
        this.registerCaptcha.clear()
      }
    },

    // ==================== 忘记密码相关 ====================

    /**
     * 打开忘记密码弹窗
     */
    async handleForgotPassword() {
      this.showForgotPasswordModal = true
      this.resetForgotPasswordForm()

      // 加载验证码
      await this.$nextTick()
      if (!this.forgotCaptcha) return
      setTimeout(async () => {
        try {
          await this.forgotCaptcha.load()
        } catch (error) {
          console.error('加载忘记密码验证码失败:', error)
          this.showNotification('验证码加载失败，请重试', 'error')
        }
      }, 100)
    },

    /**
     * 关闭忘记密码弹窗
     */
    closeForgotPasswordModal() {
      this.showForgotPasswordModal = false
      this.resetForgotPasswordForm()
    },

    /**
     * 重置忘记密码表单
     */
    resetForgotPasswordForm() {
      this.forgotPasswordStep = 1
      this.securityQuestion = ''
      this.forgotPasswordForm = {
        phone: '',
        captcha: '',
        securityAnswer: '',
        newPassword: '',
        confirmNewPassword: ''
      }
      this.forgotPasswordErrors = {
        phoneError: '',
        captchaError: '',
        securityAnswerError: '',
        newPasswordError: '',
        confirmNewPasswordError: ''
      }
      this.forgotPasswordLoading = false
      this.verifyAnswerLoading = false
      this.resetPasswordLoading = false

      if (this.forgotCaptcha) {
        this.forgotCaptcha.clear()
      }
    },

    /**
     * 第一步：获取安全问题
     */
    async handleGetSecurityQuestion() {
      const {phone, captcha} = this.forgotPasswordForm

      // 验证输入
      this.clearAllForgotErrors()

      if (!phone) {
        this.setForgotError('phoneError', '请输入手机号')
        return
      }

      if (!validationService.isValidPhone(phone)) {
        this.setForgotError('phoneError', '请输入正确的手机号')
        return
      }

      if (!captcha) {
        this.setForgotError('captchaError', '请输入图形验证码')
        return
      }

      if (!this.forgotCaptcha?.key) {
        this.setForgotError('captchaError', '验证码已失效，请刷新重试')
        this.refreshForgotCaptcha()  // 不使用 await
        return
      }

      this.forgotPasswordLoading = true

      try {
        const response = await authService.getSecurityQuestion({
          phone: phone,
          captchaKey: this.forgotCaptcha.key,
          captchaCode: captcha
        })

        if (response && response.securityQuestion) {
          this.securityQuestion = response.securityQuestion
          this.forgotPasswordStep = 2
          this.showNotification('验证成功，请回答问题', 'success')
        } else {
          const errorMsg = response?.message || '获取安全问题失败'
          this.setForgotError('phoneError', errorMsg)
          // 失败时刷新验证码
          this.refreshForgotCaptcha()
        }
      } catch (error) {
        console.error('获取安全问题失败:', error)

        let errorMessage = '网络错误，请稍后重试'
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        }

        // 根据错误类型设置错误信息
        if (errorMessage.includes('手机号') || errorMessage.includes('用户')) {
          this.setForgotError('phoneError', errorMessage)
        } else if (errorMessage.includes('验证码')) {
          this.setForgotError('captchaError', errorMessage)
        } else {
          this.showNotification(errorMessage, 'error')
        }

        // 刷新验证码（不使用 await）
        this.refreshForgotCaptcha()
      } finally {
        this.forgotPasswordLoading = false
      }
    },

    /**
     * 第二步：验证安全答案
     */
    async handleVerifySecurityAnswer() {
      const {securityAnswer} = this.forgotPasswordForm

      this.clearAllForgotErrors()

      if (!securityAnswer?.trim()) {
        this.setForgotError('securityAnswerError', '请输入答案')
        return
      }

      this.verifyAnswerLoading = true

      try {
        const response = await authService.verifySecurityAnswer({
          phone: this.forgotPasswordForm.phone,
          securityAnswer: securityAnswer
        })

        this.forgotPasswordStep = 3
        this.showNotification('答案正确，请设置新密码', 'success')

      } catch (error) {
        this.handleForgotPasswordException(error)
      } finally {
        this.verifyAnswerLoading = false
      }
    },

    /**
     * 第三步：重置密码
     */
    async handleResetPassword() {
      const {newPassword, confirmNewPassword} = this.forgotPasswordForm

      this.clearAllForgotErrors()

      if (!validationService.isValidPassword(newPassword)) {
        this.setForgotError('newPasswordError', '密码需6-20位')
        return
      }

      if (!validationService.isPasswordMatch(newPassword, confirmNewPassword)) {
        this.setForgotError('confirmNewPasswordError', '两次输入的密码不一致')
        return
      }

      this.resetPasswordLoading = true

      try {
        const response = await authService.resetPassword({
          phone: this.forgotPasswordForm.phone,
          newPassword: newPassword
        })

        this.forgotPasswordStep = 4
        this.showNotification('密码重置成功！', 'success')

      } catch (error) {
        this.handleForgotPasswordException(error)
      } finally {
        this.resetPasswordLoading = false
      }
    },

    /**
     * 忘记密码重置成功后的处理
     */
    handleResetSuccess() {
      this.closeForgotPasswordModal()
      this.switchToLogin()
    },

    /**
     * 忘记密码异常处理
     */
    handleForgotPasswordException(error) {
      let errorMessage = '网络错误，请稍后重试'

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message

        // 根据当前步骤设置错误
        if (this.forgotPasswordStep === 1) {
          if (errorMessage.includes('手机号') || errorMessage.includes('用户')) {
            this.setForgotError('phoneError', errorMessage)
          } else if (errorMessage.includes('验证码')) {
            this.setForgotError('captchaError', errorMessage)
          } else {
            this.showNotification(errorMessage, 'error')
          }
          // 无论什么错误，都刷新验证码
          this.refreshForgotCaptcha()
        } else {
          this.showNotification(errorMessage, 'error')
        }
      } else {
        this.showNotification(errorMessage, 'error')
        if (this.forgotPasswordStep === 1) {
          this.refreshForgotCaptcha()
        }
      }
    },

    // ==================== 辅助方法 ====================

    /**
     * 设置表单错误
     */
    setFormError(field, message) {
      if (this.errors[field] !== undefined) {
        this.errors[field] = message
      }
    },

    /**
     * 设置忘记密码错误
     */
    setForgotError(field, message) {
      if (this.forgotPasswordErrors[field] !== undefined) {
        this.forgotPasswordErrors[field] = message
      }
    },

    /**
     * 清除所有错误
     */
    clearAllErrors() {
      Object.keys(this.errors).forEach(key => {
        this.errors[key] = ''
      })
    },

    /**
     * 清除所有忘记密码错误
     */
    clearAllForgotErrors() {
      Object.keys(this.forgotPasswordErrors).forEach(key => {
        this.forgotPasswordErrors[key] = ''
      })
    },

    // ==================== 其他方法 ====================

    /**
     * 第三方登录
     */
    handleSocialLogin(platform) {
      this.showNotification(`${platform}登录功能开发中...`, 'info')
    }
  }
}
</script>

<style scoped>
/* 保持原有的CSS样式不变，新增服务条款和隐私政策弹窗样式 */
:root {
  --primary-color: #D5EBE1; /* 天缥 */
  --secondary-color: #B1D5C8; /* 沧浪 */
  --tertiary-color: #99BCAC; /* 苍篾 */
  --accent-color: #80A492; /* 缥碧 */
  --text-dark: #333333;
  --text-light: #666666;
  --white: #ffffff;
  --shadow: rgba(0, 0, 0, 0.1);
  --error-color: #e74c3c;
  --success-color: #2ecc71;
}

body {
  background-color: var(--primary-color);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* 登录/注册卡片 */
.auth-card {
  background-color: var(--white);
  border-radius: 25px;
  padding: 35px 30px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
}

.auth-header {
  text-align: center;
  margin-bottom: 30px;
}

.auth-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent-color);
  margin-bottom: 8px;
}

.auth-subtitle {
  font-size: 14px;
  color: var(--text-light);
}

/* 登录/注册标签切换 */
.auth-tabs {
  display: flex;
  margin-bottom: 30px;
  background-color: rgba(213, 235, 225, 0.3);
  border-radius: 15px;
  padding: 5px;
}

.auth-tab {
  flex: 1;
  padding: 15px 10px;
  border: none;
  background: none;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-light);
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s;
}

.auth-tab.active {
  background-color: var(--white);
  color: var(--accent-color);
  box-shadow: 0 3px 10px var(--shadow);
}

/* 表单样式 */
.auth-form {
  display: block;
  animation: fadeIn 0.5s ease;
}

.form-group {
  margin-bottom: 20px;
  position: relative;
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
  padding: 16px;
  padding-left: 45px;
  border: 1px solid var(--secondary-color);
  border-radius: 12px;
  font-size: 16px;
  color: var(--text-dark);
  transition: all 0.3s;
  background-color: rgba(213, 235, 225, 0.1);
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 42px;
  color: var(--tertiary-color);
  font-size: 18px;
}

.password-toggle {
  position: absolute;
  right: 16px;
  top: 42px;
  color: var(--tertiary-color);
  font-size: 18px;
  cursor: pointer;
  background: none;
  border: none;
}

/* 图形验证码容器 */
.captcha-container {
  position: relative;
  width: 120px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--secondary-color);
  background-color: rgba(213, 235, 225, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.captcha-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.captcha-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tertiary-color);
}

.captcha-placeholder {
  font-size: 12px;
  color: var(--text-light);
  text-align: center;
  padding: 0 5px;
}

.captcha-refresh {
  position: absolute;
  bottom: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 2px 5px;
  font-size: 12px;
  color: var(--accent-color);
}

/* 表单选项 */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  font-size: 14px;
}

.remember-me {
  display: flex;
  align-items: center;
}

.checkbox {
  width: 18px;
  height: 18px;
  margin-right: 8px;
  accent-color: var(--accent-color);
  cursor: pointer;
}

.checkbox-label {
  color: var(--text-light);
  cursor: pointer;
}

.forgot-password {
  color: var(--accent-color);
  text-decoration: none;
  font-weight: 500;
}

.forgot-password:hover {
  text-decoration: underline;
}

/* 按钮样式 */
.auth-button {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  background-color: var(--primary-color);
  color: var(--accent-color);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.auth-button:hover:not(:disabled) {
  background-color: var(--secondary-color);
}

.auth-button:active:not(:disabled) {
  transform: translateY(2px);
}

.auth-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 社交登录 */
.social-login {
  margin-top: 30px;
  text-align: center;
}

.divider {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: rgba(128, 164, 146, 0.3);
}

.divider-text {
  padding: 0 15px;
  font-size: 14px;
  color: var(--text-light);
}

.social-buttons {
  display: flex;
  gap: 15px;
}

.social-button {
  flex: 1;
  padding: 14px;
  border: 1px solid var(--secondary-color);
  border-radius: 12px;
  background-color: var(--white);
  color: var(--text-dark);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.social-button:hover {
  background-color: rgba(213, 235, 225, 0.2);
  border-color: var(--accent-color);
}

.social-button.wechat {
  color: #09bb07;
}

.social-button.alipay {
  color: #1296db;
}

/* 错误提示 */
.error-message {
  color: var(--error-color);
  font-size: 13px;
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.error-message i {
  font-size: 14px;
}

.hint-text {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: var(--text-light);
}

/* 隐私条款 */
.privacy-terms {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-light);
}

.privacy-link {
  color: var(--accent-color);
  text-decoration: none;
}

.privacy-link:hover {
  text-decoration: underline;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background-color: white;
  border-radius: 20px;
  width: 90%;
  max-width: 450px;
  max-height: 85vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
}

/* 服务条款和隐私政策弹窗 - 固定大小 */
.terms-modal,
.privacy-modal {
  max-width: 550px;
  width: 90%;
}

.terms-body,
.privacy-body {
  max-height: calc(85vh - 140px);
  overflow-y: auto;
  padding: 20px 25px;
}

/* 滚动条样式 */
.terms-body::-webkit-scrollbar,
.privacy-body::-webkit-scrollbar {
  width: 6px;
}

.terms-body::-webkit-scrollbar-track,
.privacy-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.terms-body::-webkit-scrollbar-thumb,
.privacy-body::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 3px;
}

.terms-body::-webkit-scrollbar-thumb:hover,
.privacy-body::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}

/* 内容样式 */
.terms-content,
.privacy-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-dark);
}

.terms-content h4,
.privacy-content h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-color);
  margin: 20px 0 10px 0;
}

.terms-content h4:first-child,
.privacy-content h4:first-child {
  margin-top: 0;
}

.terms-content p,
.privacy-content p {
  margin-bottom: 12px;
  color: var(--text-dark);
}

.terms-footer,
.privacy-footer {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--primary-color);
  text-align: center;
  font-size: 12px;
  color: var(--text-light);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid rgba(128, 164, 146, 0.2);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-color);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--tertiary-color);
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.modal-close:hover {
  background-color: rgba(128, 164, 146, 0.1);
  color: var(--accent-color);
}

.modal-body {
  padding: 25px;
}

.modal-footer {
  padding: 15px 25px;
  border-top: 1px solid rgba(128, 164, 146, 0.2);
}

.modal-footer .modal-button {
  margin: 0;
}

/* 忘记密码弹窗样式 */
.forgot-step {
  animation: fadeIn 0.3s ease;
}

.step-description {
  color: var(--text-light);
  font-size: 14px;
  margin-bottom: 25px;
  text-align: center;
}

.security-question-box {
  background-color: rgba(213, 235, 225, 0.2);
  border: 1px solid var(--secondary-color);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 25px;
  text-align: center;
  position: relative;
}

.question-icon {
  font-size: 24px;
  color: var(--accent-color);
  margin-bottom: 10px;
}

.security-question {
  font-size: 16px;
  color: var(--text-dark);
  font-weight: 500;
  margin: 0;
}

.modal-button {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  background-color: var(--primary-color);
  color: var(--accent-color);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.modal-button:hover:not(:disabled) {
  background-color: var(--secondary-color);
}

.modal-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-button.secondary {
  background-color: white;
  border: 1px solid var(--secondary-color);
  color: var(--text-light);
}

.modal-button.secondary:hover:not(:disabled) {
  background-color: rgba(213, 235, 225, 0.2);
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.modal-buttons {
  display: flex;
  gap: 15px;
  margin-top: 25px;
}

.modal-buttons .modal-button {
  margin-top: 0;
}

.success-step {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  font-size: 60px;
  color: var(--success-color);
  margin-bottom: 20px;
  animation: bounce 1s ease;
}

.success-title {
  font-size: 18px;
  color: var(--accent-color);
  margin-bottom: 10px;
}

.success-message {
  color: var(--text-light);
  font-size: 14px;
  margin-bottom: 30px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-20px);
  }
  60% {
    transform: translateY(-10px);
  }
}

/* 响应式调整 */
@media (max-width: 480px) {
  .auth-card {
    padding: 25px 20px;
  }

  .auth-title {
    font-size: 22px;
  }

  .form-input {
    padding: 14px;
    padding-left: 45px;
    font-size: 15px;
  }

  .social-buttons {
    flex-direction: column;
  }

  .captcha-container {
    width: 100px;
    height: 35px;
  }

  .modal-content {
    width: 95%;
    max-width: 95%;
  }

  .modal-header {
    padding: 15px 20px;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-buttons {
    flex-direction: column;
  }

  .terms-body,
  .privacy-body {
    padding: 15px 20px;
  }
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>