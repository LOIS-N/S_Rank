package com.ssafy.srank.desk.presentation.controller;

import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.desk.application.dto.response.DeskTemplateResponse;
import com.ssafy.srank.desk.application.service.DeskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/desks")
@RequiredArgsConstructor
public class DeskController {

    private final DeskService deskService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DeskTemplateResponse>>> getDeskTemplate(
            @RequestHeader("X-User-Id") Long userId){
        return ResponseEntity.ok(ApiResponse.success(deskService.getDeskTemplateList(userId)));
    }

    @PostMapping("/{deskId}/unlock")
    public ResponseEntity<ApiResponse<Void>> unlockDesk(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long deskId){

        deskService.unlockDesk(userId, deskId);
        return ResponseEntity.ok(ApiResponse.success());
    }

}
