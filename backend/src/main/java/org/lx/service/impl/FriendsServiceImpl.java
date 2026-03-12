package org.lx.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.lx.common.RespBean;
import org.lx.common.RespCode;
import org.lx.config.UserUtil;
import org.lx.config.security.JwtTokenUtil;
import org.lx.mapper.FriendRequestsMapper;
import org.lx.mapper.UsersMapper;
import org.lx.pojo.FriendRequests;
import org.lx.pojo.Friends;
import org.lx.mapper.FriendsMapper;
import org.lx.pojo.Users;
import org.lx.pojo.dto.FriendDTO;
import org.lx.pojo.vo.ReceivedFriendRequestVO;
import org.lx.pojo.vo.FriendsVO;
import org.lx.pojo.vo.SentFriendRequestVO;
import org.lx.service.IFriendsService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * <p>
 * 好友关系表 - 存储用户之间的好友关系 服务实现类
 * </p>
 *
 * @author lx
 * @since 2026-03-04
 */
@Slf4j
@Service
public class FriendsServiceImpl extends ServiceImpl<FriendsMapper, Friends> implements IFriendsService {

    @Autowired
    private UserUtil userUtil;

    @Autowired
    private UsersMapper usersMapper;

    @Autowired
    private FriendsMapper friendsMapper;

    @Value("${jwt.tokenHeader}")
    private String tokenHeader;
    @Autowired
    private FriendRequestsMapper friendRequestsMapper;

    /**
     * 获取好友列表
     * @return
     */
    @Override
    public RespBean getFriendsList(HttpServletRequest request) {
        try {
            Users user = userUtil.getUserFromSecurityContext();
            if (user == null) {
                return RespBean.error(RespCode.INTERNAL_SERVER_ERROR, "系统错误");
            }
            //根据id查询数据
            LambdaQueryWrapper<Friends> queryWrapperGetFriends = new LambdaQueryWrapper<>();
            queryWrapperGetFriends.eq(Friends::getUserId, user.getId());
            List<Friends> friends = friendsMapper.selectList(queryWrapperGetFriends);

            List<FriendsVO> friendsVOList = new ArrayList<>();
            for (Friends friend : friends) {
                //查询好友数据是否存在
                Users myFriend = usersMapper.selectById(friend.getFriendId());
                if (myFriend == null) {
                    continue;
                }
                //将好友数据放到list里
                FriendsVO friendsVO = new FriendsVO()
                        .setId(myFriend.getId())
                        .setFriendId(friend.getFriendId())
                        .setPhone(myFriend.getPhone())
                        .setAvatar(myFriend.getAvatar())
                        .setNickname(myFriend.getUsername())
                        .setAddTime(friend.getCreatedAt());

                friendsVOList.add(friendsVO);
            }
            return RespBean.success(RespCode.SUCCESS, "查询成功", friendsVOList);
        } catch (Exception e) {
            e.printStackTrace();
            return RespBean.error(RespCode.INTERNAL_SERVER_ERROR, "查询好友列表失败: " + e.getMessage());
        }
    }

    /**
     * 获取收到的好友申请
     * @return
     */
    @Override
    public RespBean getReceived() {
        try {
            Users user = userUtil.getUserFromSecurityContext();
            if (user == null) {
                return RespBean.error(RespCode.INTERNAL_SERVER_ERROR, "系统错误");
            }

            //根据id查询相关信息
            LambdaQueryWrapper<FriendRequests> queryWrapperGetReceived = new LambdaQueryWrapper<>();
            queryWrapperGetReceived.eq(FriendRequests::getToUserId, user.getId());
            List<FriendRequests> friendRequests = friendRequestsMapper.selectList(queryWrapperGetReceived);

            //存放数据到集合里
            List<ReceivedFriendRequestVO> receivedFriendRequestVOList = new ArrayList<>();
            for (FriendRequests friendRequest : friendRequests) {
                //查询用户数据
                Users newFriend = usersMapper.selectById(friendRequest.getFromUserId());
                if (newFriend == null) {
                    continue;
                }
                ReceivedFriendRequestVO friendRequestVO = new ReceivedFriendRequestVO();

                friendRequestVO.setId(friendRequest.getId())
                        .setFromUserId(friendRequest.getFromUserId())
                        .setMessage(friendRequest.getMessage())
                        .setStatus(friendRequest.getStatus())
                        .setCreateTime(friendRequest.getCreatedAt())
                        .setFromUserNickname(newFriend.getUsername())
                        .setFromUserPhone(newFriend.getPhone())
                        .setFromUserAvatar(newFriend.getAvatar());

                receivedFriendRequestVOList.add(friendRequestVO);
            }
            return RespBean.success(RespCode.SUCCESS, "查询成功", receivedFriendRequestVOList);
        } catch (Exception e) {
            e.printStackTrace();
            return RespBean.error(RespCode.INTERNAL_SERVER_ERROR, "查询收到的好友申请: " + e.getMessage());
        }
    }

    /**
     * 获取发送的申请
     * @return
     */
    @Override
    public RespBean getSent() {
        try {
            Users user = userUtil.getUserFromSecurityContext();
            if (user == null) {
                return RespBean.error(RespCode.INTERNAL_SERVER_ERROR, "系统错误");
            }
            //根据id查询发送的信息
            LambdaQueryWrapper<FriendRequests> queryWrapperGetSent = new LambdaQueryWrapper<>();
            queryWrapperGetSent.eq(FriendRequests::getFromUserId, user.getId());
            List<FriendRequests> friendRequests = friendRequestsMapper.selectList(queryWrapperGetSent);

            //将数据存到
            List<SentFriendRequestVO> sentFriendRequestVOList = new ArrayList<>();
            for (FriendRequests friendRequest : friendRequests) {
                Users newFriend = usersMapper.selectById(friendRequest.getToUserId());
                if (newFriend == null) {
                    continue;
                }
                SentFriendRequestVO friendRequestVO = new SentFriendRequestVO();

                friendRequestVO.setId(friendRequest.getId())
                        .setToUserId(friendRequest.getToUserId())
                        .setToUserAvatar(newFriend.getAvatar())
                        .setToUserNickname(newFriend.getUsername())
                        .setToUserPhone(newFriend.getPhone())
                        .setStatus(friendRequest.getStatus())
                        .setCreateTime(friendRequest.getCreatedAt())
                        .setMessage(friendRequest.getMessage());

                sentFriendRequestVOList.add(friendRequestVO);
            }
            return RespBean.success(RespCode.SUCCESS, "查询成功", sentFriendRequestVOList);
        } catch (Exception e) {
            e.printStackTrace();
            return RespBean.error(RespCode.INTERNAL_SERVER_ERROR, "查询发送的的好友申请: " + e.getMessage());
        }
    }

    /**
     * 发送好友申请
     * @param phone
     * @param message
     * @return
     */
    @Override
    public RespBean sendApplication(String phone, String message) {
        Users user = userUtil.getUserFromSecurityContext();

        if (user == null) {
            return RespBean.error(RespCode.INTERNAL_SERVER_ERROR, "系统错误");
        }

        if (phone.equals(user.getPhone())) {
            return RespBean.error(RespCode.DATA_ALREADY_EXISTS, "不能自己加自己");
        }

        //查看好友是否存在
        LambdaQueryWrapper<Users> queryWrapperSendApplication = new LambdaQueryWrapper<>();
        queryWrapperSendApplication.eq(Users::getPhone, phone);
        Users friend = usersMapper.selectOne(queryWrapperSendApplication);

        if (friend == null) {
            return RespBean.error(RespCode.USER_NOT_EXIST, "好友并未注册");
        }

        //查看是否已经加过好友
        if (friendsMapper.selectWhetherFriend(user.getId(), friend.getId())) {
            return RespBean.error(RespCode.USER_NOT_EXIST, "不能重复加好友");
        }

        try {
            FriendRequests friendRequest = new FriendRequests();
            friendRequest
                    .setToUserId(friend.getId())
                    .setFromUserId(user.getId())
                    .setStatus(0)
                    .setMessage(message)
                    .setCreatedAt(LocalDateTime.now())
                    .setUpdatedAt(LocalDateTime.now());

            int insert = friendRequestsMapper.insert(friendRequest);

            if (insert == 0) {
                return RespBean.error(RespCode.DATA_CREATE_FAILED, "数据库插入失败");
            }

            return RespBean.success(RespCode.SUCCESS, "发送申请成功");
        } catch (DuplicateKeyException e) {
            // 捕获唯一索引冲突异常
            return RespBean.error(RespCode.DATA_ALREADY_EXISTS, "已经发送过好友申请，请勿重复发送");
        }
    }

    /**
     * 同意好友申请 - 需要处理并发
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public RespBean accept(Integer requestId) {
        try {
            Users user = userUtil.getUserFromSecurityContext();

            // 使用版本号查询并删除
            FriendRequests request = friendRequestsMapper.selectById(requestId);
            if (request == null) {
                return RespBean.error(RespCode.DATA_NOT_FOUND, "申请不存在");
            }

            // 删除时带上版本号
            if (friendRequestsMapper.deleteById(request) == 0) {
                return RespBean.error(RespCode.DATA_CREATE_FAILED, "申请已被其他人处理");
            }

            // 添加好友关系
            if (!addFriend(request.getFromUserId(), user.getId()) ||
                    !addFriend(user.getId(), request.getFromUserId())) {
                throw new RuntimeException("添加好友关系失败");
            }

            return RespBean.success(RespCode.SUCCESS, "好友添加成功");
        } catch (Exception e) {
            log.error("接受好友申请失败", e);
            throw new RuntimeException("接受好友申请失败", e);
        }
    }

    /**
     * 拒绝好友申请
     * @param requestId
     * @return
     */
    @Override
    public RespBean requestId(Integer requestId) {
        try {
            //删除friend_requests表中相应数据
            friendRequestsMapper.deleteById(requestId);
            return RespBean.success(RespCode.SUCCESS, "拒绝成功");
        } catch (Exception e) {
            e.printStackTrace();
            return RespBean.error(RespCode.DATA_CREATE_FAILED, "拒绝失败");
        }
    }

    /**
     * 删除好友 - 需要处理版本号
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public RespBean delete(Integer friendId) {
        try {
            Integer currentUserId = userUtil.getUserFromSecurityContext().getId();

            // 需要先查询出记录（包含版本号）
            LambdaQueryWrapper<Friends> wrapper1 = new LambdaQueryWrapper<>();
            wrapper1.eq(Friends::getUserId, currentUserId)
                    .eq(Friends::getFriendId, friendId);
            Friends friend1 = friendsMapper.selectOne(wrapper1);

            LambdaQueryWrapper<Friends> wrapper2 = new LambdaQueryWrapper<>();
            wrapper2.eq(Friends::getUserId, friendId)
                    .eq(Friends::getFriendId, currentUserId);
            Friends friend2 = friendsMapper.selectOne(wrapper2);

            if (friend1 == null || friend2 == null) {
                return RespBean.error(RespCode.DATA_NOT_FOUND, "好友关系不存在");
            }

            // 根据ID删除（会自动带上版本号条件）
            int result1 = friendsMapper.deleteById(friend1.getId());
            int result2 = friendsMapper.deleteById(friend2.getId());

            // 或者使用带版本号的更新删除
            // int result1 = friendsMapper.delete(friend1); // 这样也可以

            if (result1 > 0 && result2 > 0) {
                return RespBean.success(RespCode.SUCCESS, "删除好友成功");
            } else if (result1 == 0 && result2 == 0) {
                return RespBean.error(RespCode.DATA_NOT_FOUND, "好友关系不存在或已被删除");
            } else {
                throw new RuntimeException("删除好友关系不完整");
            }
        } catch (Exception e) {
            log.error("删除好友失败", e);
            throw new RuntimeException("删除好友失败", e);
        }
    }

    /**
     * 添加好友 - 使用乐观锁
     */
    private Boolean addFriend(Integer friendId, Integer userId) {
        try {
            Friends friend = new Friends();
            friend.setFriendId(friendId)
                    .setUserId(userId)
                    .setStatus(1)
                    .setVersion(0)  // 初始版本号为0
                    .setCreatedAt(LocalDateTime.now())
                    .setUpdatedAt(LocalDateTime.now());

            // MyBatis-Plus 会自动处理版本号
            return friendsMapper.insert(friend) > 0;
        } catch (Exception e) {
            log.error("添加好友失败：" + e.getMessage());
            return false;
        }
    }

}
