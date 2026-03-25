package com.ssafy.srank.rabbitmq.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    // ─── Exchange ──────────────────────────────────────────────────────────────
    public static final String LOG_EXCHANGE        = "log.exchange";
    public static final String BLOCKCHAIN_EXCHANGE = "blockchain.exchange";

    // ─── 사용자 로그 ──────────────────────────────────────────────────────────
    public static final String LOG_USER_QUEUE       = "log.user.queue";
    public static final String LOG_USER_ROUTING_KEY = "log.user.info";

    // ─── 퀘스트 로그 ──────────────────────────────────────────────────────────
    public static final String LOG_QUEST_QUEUE       = "log.quest.queue";
    public static final String LOG_QUEST_ROUTING_KEY = "log.quest.info";

    // ─── 카드 로그 ────────────────────────────────────────────────────────────
    public static final String LOG_CARD_QUEUE       = "log.card.queue";
    public static final String LOG_CARD_ROUTING_KEY = "log.card.info";

    // ─── 골드 로그 ────────────────────────────────────────────────────────────
    public static final String LOG_GOLD_QUEUE       = "log.gold.queue";
    public static final String LOG_GOLD_ROUTING_KEY = "log.gold.info";

    // ─── 뽑기 로그 ────────────────────────────────────────────────────────────
    public static final String LOG_GACHA_QUEUE       = "log.gacha.queue";
    public static final String LOG_GACHA_ROUTING_KEY = "log.gacha.info";

    // ─── 강화 로그 ────────────────────────────────────────────────────────────
    public static final String LOG_ENHANCE_QUEUE       = "log.enhance.queue";
    public static final String LOG_ENHANCE_ROUTING_KEY = "log.enhance.info";

    // ─── 코인 로그 ────────────────────────────────────────────────────────────
    public static final String LOG_COIN_QUEUE       = "log.coin.queue";
    public static final String LOG_COIN_ROUTING_KEY = "log.coin.info";

    // ─── 거래 아이템 로그 ─────────────────────────────────────────────────────
    public static final String LOG_MARKET_ITEM_QUEUE       = "log.marketItem.queue";
    public static final String LOG_MARKET_ITEM_ROUTING_KEY = "log.marketItem.info";

    // ─── 거래 로그 ────────────────────────────────────────────────────────────
    public static final String LOG_MARKET_QUEUE       = "log.market.queue";
    public static final String LOG_MARKET_ROUTING_KEY = "log.market.info";

    // ─── 합성 로그 ────────────────────────────────────────────────────────────
    public static final String LOG_SYNTHESIS_QUEUE       = "log.synthesis.queue";
    public static final String LOG_SYNTHESIS_ROUTING_KEY = "log.synthesis.info";

    // ─── 업적 로그 ────────────────────────────────────────────────────────────
    public static final String LOG_ACHIEVEMENT_QUEUE       = "log.achievement.queue";
    public static final String LOG_ACHIEVEMENT_ROUTING_KEY = "log.achievement.info";

    // ─── 블록체인 ─────────────────────────────────────────────────────────────
    public static final String BLOCKCHAIN_QUEUE       = "blockchain.queue";
    public static final String BLOCKCHAIN_ROUTING_KEY = "blockchain.request";

    // ══════════════════════════════════════════════════════════════════════════
    // Exchange Bean
    // ══════════════════════════════════════════════════════════════════════════

    @Bean
    public DirectExchange logExchange() {
        return new DirectExchange(LOG_EXCHANGE);
    }

    @Bean
    public DirectExchange blockchainExchange() {
        return new DirectExchange(BLOCKCHAIN_EXCHANGE);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Queue Bean
    // ══════════════════════════════════════════════════════════════════════════

    /** 사용자 인증 로그 큐 (durable=true: 브로커 재시작 시에도 큐 유지) */
    @Bean public Queue userLogQueue()       { return new Queue(LOG_USER_QUEUE,        true); }

    /** 퀘스트 로그 큐 */
    @Bean public Queue questLogQueue()      { return new Queue(LOG_QUEST_QUEUE,       true); }

    /** 카드 로그 큐 */
    @Bean public Queue cardLogQueue()       { return new Queue(LOG_CARD_QUEUE,        true); }

    /** 골드 로그 큐 */
    @Bean public Queue goldLogQueue()       { return new Queue(LOG_GOLD_QUEUE,        true); }

    /** 뽑기 로그 큐 */
    @Bean public Queue gachaLogQueue()      { return new Queue(LOG_GACHA_QUEUE,       true); }

    /** 강화 로그 큐 */
    @Bean public Queue enhanceLogQueue()    { return new Queue(LOG_ENHANCE_QUEUE,     true); }

    /** 코인 로그 큐 */
    @Bean public Queue coinLogQueue()       { return new Queue(LOG_COIN_QUEUE,        true); }

    /** 거래 아이템 로그 큐 */
    @Bean public Queue marketItemLogQueue() { return new Queue(LOG_MARKET_ITEM_QUEUE, true); }

    /** 거래 로그 큐 */
    @Bean public Queue marketLogQueue()     { return new Queue(LOG_MARKET_QUEUE,      true); }

    /** 합성 로그 큐 */
    @Bean public Queue synthesisLogQueue()  { return new Queue(LOG_SYNTHESIS_QUEUE,   true); }

    /** 업적 로그 큐 */
    @Bean public Queue achievementLogQueue(){ return new Queue(LOG_ACHIEVEMENT_QUEUE, true); }

    /** 블록체인 요청 큐 */
    @Bean public Queue blockchainQueue()    { return new Queue(BLOCKCHAIN_QUEUE,      true); }

    // ══════════════════════════════════════════════════════════════════════════
    // Binding Bean (Queue ↔ Exchange ↔ RoutingKey)
    // ══════════════════════════════════════════════════════════════════════════

    @Bean
    public Binding userLogBinding() {
        return BindingBuilder.bind(userLogQueue()).to(logExchange()).with(LOG_USER_ROUTING_KEY);
    }

    @Bean
    public Binding questLogBinding() {
        return BindingBuilder.bind(questLogQueue()).to(logExchange()).with(LOG_QUEST_ROUTING_KEY);
    }

    @Bean
    public Binding cardLogBinding() {
        return BindingBuilder.bind(cardLogQueue()).to(logExchange()).with(LOG_CARD_ROUTING_KEY);
    }

    @Bean
    public Binding goldLogBinding() {
        return BindingBuilder.bind(goldLogQueue()).to(logExchange()).with(LOG_GOLD_ROUTING_KEY);
    }

    @Bean
    public Binding gachaLogBinding() {
        return BindingBuilder.bind(gachaLogQueue()).to(logExchange()).with(LOG_GACHA_ROUTING_KEY);
    }

    @Bean
    public Binding enhanceLogBinding() {
        return BindingBuilder.bind(enhanceLogQueue()).to(logExchange()).with(LOG_ENHANCE_ROUTING_KEY);
    }

    @Bean
    public Binding coinLogBinding() {
        return BindingBuilder.bind(coinLogQueue()).to(logExchange()).with(LOG_COIN_ROUTING_KEY);
    }

    @Bean
    public Binding marketItemLogBinding() {
        return BindingBuilder.bind(marketItemLogQueue()).to(logExchange()).with(LOG_MARKET_ITEM_ROUTING_KEY);
    }

    @Bean
    public Binding marketLogBinding() {
        return BindingBuilder.bind(marketLogQueue()).to(logExchange()).with(LOG_MARKET_ROUTING_KEY);
    }

    @Bean
    public Binding synthesisLogBinding() {
        return BindingBuilder.bind(synthesisLogQueue()).to(logExchange()).with(LOG_SYNTHESIS_ROUTING_KEY);
    }

    @Bean
    public Binding achievementLogBinding() {
        return BindingBuilder.bind(achievementLogQueue()).to(logExchange()).with(LOG_ACHIEVEMENT_ROUTING_KEY);
    }

    @Bean
    public Binding blockchainBinding() {
        return BindingBuilder.bind(blockchainQueue()).to(blockchainExchange()).with(BLOCKCHAIN_ROUTING_KEY);
    }
}
