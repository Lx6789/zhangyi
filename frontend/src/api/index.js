/**
 * API模块统一导出入口
 */
export * from './constants';     // 导出API常量
export * from './auth';         // 导出认证API
export * from './business';     // 导出业务API
export * from './chart';        // 导出图表API
export * from './saving';       // 导出储蓄API
export * from './friends';      // 导出好友API
export * from './backup';       // 导出备份API

// 按模块分组导出（推荐使用方式）
export { API } from './constants';

// 改为使用 import 而不是 require
import * as auth from './auth';
import * as business from './business';
import * as chart from './chart';
import * as saving from './saving';
import * as backup from './backup';

// 默认导出所有API函数的集合
export default {
    ...auth,
    ...business,
    ...chart,
    ...saving,
    ...backup,
}