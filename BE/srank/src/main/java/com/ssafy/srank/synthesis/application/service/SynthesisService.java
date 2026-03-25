package com.ssafy.srank.synthesis.application.service;

import com.ssafy.srank.synthesis.application.dto.request.SynthesisAttemptRequest;
import com.ssafy.srank.synthesis.application.dto.request.SynthesisVerificationRequest;
import com.ssafy.srank.synthesis.application.dto.response.SynthesisAttemptResponse;
import com.ssafy.srank.synthesis.application.dto.response.SynthesisVerificationResponse;

public interface SynthesisService {

    SynthesisAttemptResponse attempt(Long userId, SynthesisAttemptRequest request);

    SynthesisVerificationResponse verify(SynthesisVerificationRequest request);
}
