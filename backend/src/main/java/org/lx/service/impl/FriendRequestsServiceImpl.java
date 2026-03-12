package org.lx.service.impl;

import org.lx.pojo.FriendRequests;
import org.lx.mapper.FriendRequestsMapper;
import org.lx.service.IFriendRequestsService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 好友申请表 - 存储用户之间的好友申请 服务实现类
 * </p>
 *
 * @author lx
 * @since 2026-03-05
 */
@Service
public class FriendRequestsServiceImpl extends ServiceImpl<FriendRequestsMapper, FriendRequests> implements IFriendRequestsService {

}
