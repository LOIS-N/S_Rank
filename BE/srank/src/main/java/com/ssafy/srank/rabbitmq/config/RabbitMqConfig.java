package com.ssafy.srank.rabbitmq.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    // 로그
    public static final String LOG_EXCHANGE = "log.exchange";
    public static final String LOG_QUEUE = "log.queue";
    public static final String LOG_ROUTING_KEY = "log.info";

    // 블록체인
    public static final String BLOCKCHAIN_EXCHANGE = "blockchain.exchange";
    public static final String BLOCKCHAIN_QUEUE = "blockchain.queue";
    public static final String BLOCKCHAIN_ROUTING_KEY = "blockchain.request";

    @Bean
    public DirectExchange logExchange() {
        return new DirectExchange(LOG_EXCHANGE);
    }

    @Bean
    public Queue logQueue() {
        return new Queue(LOG_QUEUE, true);
    }

    @Bean
    public Binding logBinding() {
        return BindingBuilder.bind(logQueue())
                .to(logExchange())
                .with(LOG_ROUTING_KEY);
    }

    @Bean
    public DirectExchange blockchainExchange() {
        return new DirectExchange(BLOCKCHAIN_EXCHANGE);
    }

    @Bean
    public Queue blockchainQueue() {
        return new Queue(BLOCKCHAIN_QUEUE, true);
    }

    @Bean
    public Binding blockchainBinding() {
        return BindingBuilder.bind(blockchainQueue())
                .to(blockchainExchange())
                .with(BLOCKCHAIN_ROUTING_KEY);
    }
}