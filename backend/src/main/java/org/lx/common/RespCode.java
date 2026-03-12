package org.lx.common;

/**
 * @Title: RespCode
 * @Author: MrLu2
 * @Package: org.lx.common
 * @Date: 2026/1/4 18:29
 * @Description: 响应码常量类
 */

public class RespCode {

    // ========== 成功状态码 ==========
    /** 操作成功 */
    public static final Integer SUCCESS = 200;
    /** 创建成功（如新建资源） */
    public static final Integer CREATED = 201;
    /** 请求已接受，正在处理中 */
    public static final Integer ACCEPTED = 202;

    // ========== 客户端错误 4xx ==========
    /** 请求参数错误，如缺少必要参数或参数格式不正确 */
    public static final Integer BAD_REQUEST = 400;
    /** 未授权，需要登录或认证 */
    public static final Integer UNAUTHORIZED = 401;
    /** 权限不足，禁止访问 */
    public static final Integer FORBIDDEN = 403;
    /** 请求的资源不存在 */
    public static final Integer NOT_FOUND = 404;
    /** 请求方法不允许，如使用POST访问只支持GET的接口 */
    public static final Integer METHOD_NOT_ALLOWED = 405;
    /** 资源冲突，如创建重复的数据 */
    public static final Integer CONFLICT = 409;
    /** 请求过于频繁，超出限制 */
    public static final Integer TOO_MANY_REQUESTS = 429;

    // ========== 服务器错误 5xx ==========
    /** 服务器内部错误，通用服务器错误 */
    public static final Integer INTERNAL_SERVER_ERROR = 500;
    /** 服务暂时不可用，如维护中或过载 */
    public static final Integer SERVICE_UNAVAILABLE = 503;

    // ========== 用户相关 1000-1099 ==========
    /** 用户不存在 */
    public static final Integer USER_NOT_EXIST = 1001;
    /** 用户已被禁用 */
    public static final Integer USER_DISABLED = 1002;
    /** 用户名或密码错误，登录失败 */
    public static final Integer LOGIN_FAILED = 1003;
    /** 用户已存在，如注册时用户名重复 */
    public static final Integer USER_ALREADY_EXISTS = 1004;
    /** 密码错误 */
    public static final Integer PASSWORD_ERROR = 1005;
    /** 密码重置失败 */
    public static final Integer PASSWORD_EXPIRED = 1006;
    /** 访问令牌已过期 */
    public static final Integer TOKEN_EXPIRED = 1006;
    /** 访问令牌无效 */
    public static final Integer TOKEN_INVALID = 1007;
    /** 账户已被锁定 */
    public static final Integer ACCOUNT_LOCKED = 1008;
    /** 登录已过期，需要重新登录 */
    public static final Integer LOGIN_EXPIRED = 1009;

    // ========== 数据相关 1200-1299 ==========
    /** 数据不存在 */
    public static final Integer DATA_NOT_FOUND = 1201;
    /** 数据已存在 */
    public static final Integer DATA_ALREADY_EXISTS = 1202;
    /** 数据校验失败 */
    public static final Integer DATA_VALIDATION_ERROR = 1203;
    /** 数据删除失败 */
    public static final Integer DATA_DELETE_FAILED = 1204;
    /** 数据更新失败 */
    public static final Integer DATA_UPDATE_FAILED = 1205;
    /** 数据创建失败 */
    public static final Integer DATA_CREATE_FAILED = 1206;
    /** 安全问题不存在 */
    public static final Integer SECURITY_QUESTION_NOT_SET = 1207;
    /** 安全答案错误 */
    public static final Integer SECURITY_ANSWER_WRONG = 1208;

    // ========== 记账业务相关 1300-1399 ==========
    /** 账单不存在 */
    public static final Integer BILL_NOT_EXIST = 1301;
    /** 账单创建失败 */
    public static final Integer BILL_CREATE_FAILED = 1302;
    /** 账单更新失败 */
    public static final Integer BILL_UPDATE_FAILED = 1303;
    /** 账单删除失败 */
    public static final Integer BILL_DELETE_FAILED = 1304;
    /** 账单分类不存在 */
    public static final Integer BILL_CATEGORY_NOT_EXIST = 1305;
    /** 账单分类已存在 */
    public static final Integer BILL_CATEGORY_EXISTS = 1306;
    /** 账单日期无效 */
    public static final Integer BILL_DATE_INVALID = 1307;
    /** 账单金额无效，如金额为负数或格式错误 */
    public static final Integer BILL_AMOUNT_INVALID = 1308;
    /** 账单类型无效，如不是收入或支出 */
    public static final Integer BILL_TYPE_INVALID = 1309;

    // ========== 分类相关 1400-1499 ==========
    /** 分类不存在 */
    public static final Integer CATEGORY_NOT_EXIST = 1401;
    /** 分类已存在 */
    public static final Integer CATEGORY_EXISTS = 1402;
    /** 分类存在子分类，无法删除 */
    public static final Integer CATEGORY_HAS_CHILDREN = 1403;
    /** 分类存在关联的账单，无法删除 */
    public static final Integer CATEGORY_HAS_BILLS = 1404;
    /** 分类类型无效 */
    public static final Integer CATEGORY_TYPE_INVALID = 1405;
    /** 分类图标无效 */
    public static final Integer CATEGORY_ICON_INVALID = 1406;

    // ========== 账户相关 1500-1599 ==========
    /** 账户不存在 */
    public static final Integer ACCOUNT_NOT_EXIST = 1501;
    /** 账户已存在 */
    public static final Integer ACCOUNT_EXISTS = 1502;
    /** 账户余额不足 */
    public static final Integer ACCOUNT_BALANCE_INSUFFICIENT = 1503;
    /** 账户转账失败 */
    public static final Integer ACCOUNT_TRANSFER_FAILED = 1504;
    /** 账户类型无效 */
    public static final Integer ACCOUNT_TYPE_INVALID = 1505;
    /** 账户币种无效 */
    public static final Integer ACCOUNT_CURRENCY_INVALID = 1506;

    // ========== 预算相关 1600-1699 ==========
    /** 预算不存在 */
    public static final Integer BUDGET_NOT_EXIST = 1601;
    /** 预算已存在 */
    public static final Integer BUDGET_EXISTS = 1602;
    /** 预算超出限制 */
    public static final Integer BUDGET_OVER_LIMIT = 1603;
    /** 预算已超支 */
    public static final Integer BUDGET_EXCEEDED = 1604;
    /** 预算周期无效 */
    public static final Integer BUDGET_PERIOD_INVALID = 1605;
    /** 预算金额无效 */
    public static final Integer BUDGET_AMOUNT_INVALID = 1606;

    // ========== 统计报表相关 1700-1799 ==========
    /** 报表生成失败 */
    public static final Integer REPORT_GENERATE_FAILED = 1701;
    /** 报表数据无效 */
    public static final Integer REPORT_DATA_INVALID = 1702;
    /** 报表周期无效 */
    public static final Integer REPORT_PERIOD_INVALID = 1703;
    /** 报表类型无效 */
    public static final Integer REPORT_TYPE_INVALID = 1704;
    /** 报表导出失败 */
    public static final Integer REPORT_EXPORT_FAILED = 1705;

    // ========== 文件相关 1800-1899 ==========
    /** 文件上传失败 */
    public static final Integer FILE_UPLOAD_FAILED = 1801;
    /** 文件下载失败 */
    public static final Integer FILE_DOWNLOAD_FAILED = 1802;
    /** 文件不存在 */
    public static final Integer FILE_NOT_EXIST = 1803;
    /** 文件大小超出限制 */
    public static final Integer FILE_SIZE_EXCEEDED = 1804;
    /** 文件类型不支持 */
    public static final Integer FILE_TYPE_NOT_SUPPORTED = 1805;
    /** 文件导入失败 */
    public static final Integer FILE_IMPORT_FAILED = 1806;
    /** 文件导出失败 */
    public static final Integer FILE_EXPORT_FAILED = 1807;

    // ========== 参数校验相关 1900-1999 ==========
    /** 缺少必要参数 */
    public static final Integer PARAM_REQUIRED = 1901;
    /** 参数无效 */
    public static final Integer PARAM_INVALID = 1902;
    /** 参数格式错误 */
    public static final Integer PARAM_FORMAT_ERROR = 1903;
    /** 参数范围错误 */
    public static final Integer PARAM_RANGE_ERROR = 1904;
    /** 参数长度错误 */
    public static final Integer PARAM_LENGTH_ERROR = 1905;

    // ========== 系统配置相关 2000-2099 ==========
    /** 配置不存在 */
    public static final Integer CONFIG_NOT_EXIST = 2001;
    /** 配置更新失败 */
    public static final Integer CONFIG_UPDATE_FAILED = 2002;

    // ========== 权限相关 2100-2199 ==========
    /** 权限不足，无法执行该操作 */
    public static final Integer PERMISSION_DENIED = 2101;
    /** 角色不存在 */
    public static final Integer ROLE_NOT_EXIST = 2102;
    /** 角色已存在 */
    public static final Integer ROLE_EXISTS = 2103;
    /** 用户角色已存在 */
    public static final Integer USER_ROLE_EXISTS = 2104;

    // ========== 家庭/团队相关 2200-2299 ==========
    /** 家庭/团队不存在 */
    public static final Integer FAMILY_NOT_EXIST = 2201;
    /** 家庭/团队已存在 */
    public static final Integer FAMILY_EXISTS = 2202;
    /** 家庭成员已存在 */
    public static final Integer FAMILY_MEMBER_EXISTS = 2203;
    /** 家庭成员不存在 */
    public static final Integer FAMILY_MEMBER_NOT_EXIST = 2204;
    /** 家庭邀请失败 */
    public static final Integer FAMILY_INVITE_FAILED = 2205;
    /** 加入家庭失败 */
    public static final Integer FAMILY_JOIN_FAILED = 2206;

    // ========== 提醒相关 2300-2399 ==========
    /** 提醒不存在 */
    public static final Integer REMINDER_NOT_EXIST = 2301;
    /** 提醒创建失败 */
    public static final Integer REMINDER_CREATE_FAILED = 2302;
    /** 提醒时间无效 */
    public static final Integer REMINDER_TIME_INVALID = 2303;

    // ========== 标签相关 2400-2499 ==========
    /** 标签不存在 */
    public static final Integer TAG_NOT_EXIST = 2401;
    /** 标签已存在 */
    public static final Integer TAG_EXISTS = 2402;
    /** 标签关联失败 */
    public static final Integer TAG_ATTACH_FAILED = 2403;

    // ========== 备份恢复相关 2500-2599 ==========
    /** 备份失败 */
    public static final Integer BACKUP_FAILED = 2501;
    /** 恢复失败 */
    public static final Integer RESTORE_FAILED = 2502;
    /** 备份文件无效 */
    public static final Integer BACKUP_FILE_INVALID = 2503;

    // ========== 同步相关 2600-2699 ==========
    /** 同步失败 */
    public static final Integer SYNC_FAILED = 2601;
    /** 同步冲突 */
    public static final Integer SYNC_CONFLICT = 2602;
    /** 同步数据无效 */
    public static final Integer SYNC_DATA_INVALID = 2603;

    // ========== 第三方服务 2700-2799 ==========
    /** 短信发送失败 */
    public static final Integer SMS_SEND_FAILED = 2701;
    /** 邮件发送失败 */
    public static final Integer EMAIL_SEND_FAILED = 2702;
    /** 支付失败 */
    public static final Integer PAYMENT_FAILED = 2703;

    // ========== 验证码相关 2800-2899 ==========
    /** 验证码生成失败 */
    public static final Integer CAPTCHA_GENERATE_FAILED = 2801;
    /** 验证码验证失败 */
    public static final Integer CAPTCHA_VALIDATE_FAILED = 2802;
    /** 验证码已过期 */
    public static final Integer CAPTCHA_EXPIRED = 2803;
    /** 验证码不存在 */
    public static final Integer CAPTCHA_NOT_FOUND = 2804;
    /** 验证码校验过于频繁 */
    public static final Integer CAPTCHA_TOO_FREQUENT = 2805;
}