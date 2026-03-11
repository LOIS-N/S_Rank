package com.ssafy.srank.test;

import com.ssafy.srank.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RequestMapping("/test")
@RestController
@RequiredArgsConstructor
public class testController {

    private final testService service;
    @GetMapping()
    public ResponseEntity<ApiResponse<Integer>> test(){
        return ResponseEntity.ok(ApiResponse.success(service.err()));
    }
}
