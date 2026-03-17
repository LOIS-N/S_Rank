package com.ssafy.srank.desk.presentation.controller;

import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.desk.application.dto.response.DeskTemplateResponse;
import com.ssafy.srank.desk.application.service.DeskService;
import com.ssafy.srank.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/desks")
@RequiredArgsConstructor
public class DeskController {

    private final DeskService deskService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DeskTemplateResponse>>> getDeskTemplate() {
        return ResponseEntity.ok(ApiResponse.success(deskService.getDeskTemplateList(SecurityUtil.getCurrentUserId())));
    }

    @PostMapping("/{deskId}/unlock")
    public ResponseEntity<ApiResponse<Void>> unlockDesk(@PathVariable Long deskId) {
        deskService.unlockDesk(SecurityUtil.getCurrentUserId(), deskId);
        return ResponseEntity.ok(ApiResponse.success());
    }

}
