package com.ssafy.srank.user.application.event;

import com.ssafy.srank.rabbitmq.log.message.GoldLogMessage;

public record GoldLogRequestedEvent(
        GoldLogMessage message
) {
}
