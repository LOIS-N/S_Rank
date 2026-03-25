package com.ssafy.srank.rabbitmq.log.consumer;

import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.UserAuthMessage;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;  
  
@Component  
public class UserLogConsumer {
  
    @RabbitListener(queues = RabbitMqConfig.LOG_USER_QUEUE)
    public void handle(UserAuthMessage message) {

        // 여기서 실제 이메일 발송, 알림 저장, 포인트 지급 같은 후처리 가능  
    }
}