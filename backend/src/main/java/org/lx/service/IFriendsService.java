package org.lx.service;

import org.lx.common.RespBean;
import org.lx.pojo.Friends;
import com.baomidou.mybatisplus.extension.service.IService;
import org.lx.pojo.dto.FriendDTO;

import javax.servlet.http.HttpServletRequest;

/**
 * <p>
 * 好友关系表 - 存储用户之间的好友关系 服务类
 * </p>
 *
 * @author lx
 * @since 2026-03-04
 */
public interface IFriendsService extends IService<Friends> {

    /**
     * 获取好友列表
     * @return
     */
    RespBean getFriendsList(HttpServletRequest request);

    /**
     * 获取收到的好友申请
     * @return
     */
    RespBean getReceived();

    /**
     * 获取发送的申请
     * @return
     */
    RespBean getSent();

    /**
     * 发送好友申请
     * @param phone
     * @param message
     * @return
     */
    RespBean sendApplication(String phone, String message);

    /**
     * 同意好友申请
     * @param requestId
     * @return
     */
    RespBean accept(Integer requestId);

    /**
     * 拒绝好友申请
     * @param requestId
     * @return
     */
    RespBean requestId(Integer requestId);

    /**
     * 删除好友
     * @param friendId
     * @return
     */
    RespBean delete(Integer friendId);
}
