package com.ssafy.srank.rabbitmq.log.producer;
  
import com.example.rabbitmq.config.RabbitMqConfig;  
import com.example.rabbitmq.message.SignupMessage;
import com.ssafy.srank.rabbitmq.log.message.UserAuthMessage;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;  
  
@Component  
public class UserAuthProducer {
  
    private final RabbitTemplate rabbitTemplate;  
  
    public UserAuthProducer(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;  
    }  
  
    public void sendUserMessage(UserAuthMessage message) {
        rabbitTemplate.convertAndSend(  
                RabbitMqConfig.EXCHANGE,  
                RabbitMqConfig.ROUTING_KEY,  
                message  
        );  
    }  
}