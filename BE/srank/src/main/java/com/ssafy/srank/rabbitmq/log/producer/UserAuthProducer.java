package com.ssafy.srank.rabbitmq.log.producer;

import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.UserAuthMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;  
  
@Component
@RequiredArgsConstructor
public class UserAuthProducer {
  
    private final RabbitTemplate rabbitTemplate;
  
    public void sendUserMessage(UserAuthMessage message) {
        rabbitTemplate.convertAndSend(  
                RabbitMqConfig.LOG_EXCHANGE,
                RabbitMqConfig.LOG_ROUTING_KEY,
                message  
        );  
    }  
}