package org.lx.controller;


import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.lx.common.RespBean;
import org.lx.pojo.Friends;
import org.lx.pojo.dto.FriendDTO;
import org.lx.service.IFriendsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;

/**
 * <p>
 * 好友关系表 - 存储用户之间的好友关系 前端控制器
 * </p>
 *
 * @author lx
 * @since 2026-03-04
 */
@Api(tags = "好友关系相关接口")
@Slf4j
@RestController
@RequestMapping("/friends")
public class FriendsController {

    @Autowired
    private IFriendsService friendsService;

    @ApiOperation(value = "获取好友信息")
    @GetMapping("/list")
    public RespBean getFriendsList(HttpServletRequest request) {
        return friendsService.getFriendsList(request);
    }

    @ApiOperation(value = "获取收到的好友申请")
    @GetMapping("/request/received")
    public RespBean getReceived() {
        return friendsService.getReceived();
    }

    @ApiOperation(value = "获取发送的申请")
    @GetMapping("/request/sent")
    public RespBean getSent() {
        return friendsService.getSent();
    }

    @ApiOperation(value = "发送好友申请")
    @PostMapping("/request/send")
    public RespBean sendApplication(@RequestParam String phone, @RequestParam String message) {
        return friendsService.sendApplication(phone, message);
    }

    @ApiOperation(value = "同意好友申请")
    @PostMapping("/request/accept/{requestId}")
    public RespBean accept(@PathVariable("requestId") Integer requestId) {
        return friendsService.accept(requestId);
    }

    @ApiOperation(value = "拒绝好友申请")
    @PostMapping("/request/reject/{requestId}")
    public RespBean reject(@PathVariable("requestId") Integer requestId) {
        return friendsService.requestId(requestId);
    }

    @ApiOperation(value = "删除好友")
    @DeleteMapping("/{friendId}")
    public RespBean delete(@PathVariable("friendId") Integer friendId) {
        return friendsService.delete(friendId);
    }
}
