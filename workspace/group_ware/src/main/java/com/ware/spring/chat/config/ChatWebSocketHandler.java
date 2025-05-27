package com.ware.spring.chat.config;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ware.spring.chat.domain.ChatMsgDto;
import com.ware.spring.chat.repository.ChatMsgRepository;
import com.ware.spring.chat.service.ChatMsgService;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ChatMsgService chatMsgService;
    // 채팅방 별 세션 관리
    private final Map<Long, List<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();
    private final List<WebSocketSession> commonChannelSessions = new CopyOnWriteArrayList<>();


    private final ChatMsgRepository chatMsgRepository;
    
    
    @Autowired
    public ChatWebSocketHandler(ChatMsgRepository chatMsgRepository, ChatMsgService chatMsgService) {
        this.chatMsgService = chatMsgService;
        this.chatMsgRepository = chatMsgRepository;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String path = session.getUri().getPath();

        // 공통 채널에 대한 세션 추가
        if ("/chatting/all".equals(path)) {
            commonChannelSessions.add(session);
            System.out.println("Session added to common channel");
            return;
        }

        // 채팅방 번호 추출하여 세션 추가 (예: /chatting/18)
        String roomNoStr = path.substring(path.lastIndexOf('/') + 1);
        Long roomNo = Long.valueOf(roomNoStr);

        List<WebSocketSession> sessions = roomSessions.computeIfAbsent(roomNo, k -> new ArrayList<>());
        if (!sessions.contains(session)) {
            sessions.add(session);
            System.out.println("Session added to room " + roomNo);
        }
    }
    
    private void broadcastToRoom(Long roomNo, ChatMsgDto msg, ObjectMapper objMapper, WebSocketSession senderSession) throws Exception {
        List<WebSocketSession> sessions = roomSessions.getOrDefault(roomNo, new ArrayList<>());
        for (WebSocketSession wsSession : sessions) {
            if (wsSession.isOpen()) {
                msg.setIs_from_sender(wsSession.getId().equals(senderSession.getId()) ? "Y" : "N");
                wsSession.sendMessage(new TextMessage(objMapper.writeValueAsString(msg)));
            } else {
                sessions.remove(wsSession);
            }
        }
    }

    
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        ObjectMapper objMapper = new ObjectMapper();
        ChatMsgDto msg = objMapper.readValue(payload, ChatMsgDto.class);

        String path = session.getUri().getPath();
        Long roomNo = Long.valueOf(path.substring(path.lastIndexOf('/') + 1));

        switch (msg.getChat_type()) {
            case "open":
                roomSessions.computeIfAbsent(roomNo, k -> new CopyOnWriteArrayList<>()).add(session);
                break;

            case "msg":
                chatMsgService.createChatMsg(msg);
                broadcastToRoom(roomNo, msg, objMapper, session);
                broadcastToCommonChannel(msg, objMapper);
                
                // 읽음 처리 로직 추가
                List<WebSocketSession> roomSessionsForRoom = roomSessions.get(roomNo);
                if (roomSessionsForRoom != null && roomSessionsForRoom.size() == 2) {
                    chatMsgService.updateReceiverReadStatus(roomNo, "Y");
                }
                break;

            default:
                System.out.println("Unknown message type: " + msg.getChat_type());
        }
    }

    
    private void broadcastToCommonChannel(ChatMsgDto msg, ObjectMapper objMapper) throws Exception {
        for (WebSocketSession wsSession : commonChannelSessions) {
            if (wsSession.isOpen()) {
                wsSession.sendMessage(new TextMessage(objMapper.writeValueAsString(msg)));
            } else {
                commonChannelSessions.remove(wsSession);
            }
        }
    }

    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String path = session.getUri().getPath();
        if ("/chatting/all".equals(path)) {
            commonChannelSessions.remove(session);
        } else {
            Long roomNo = Long.valueOf(path.substring(path.lastIndexOf('/') + 1));
            List<WebSocketSession> sessions = roomSessions.get(roomNo);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    roomSessions.remove(roomNo);
                }
            }
        }
    }

}
