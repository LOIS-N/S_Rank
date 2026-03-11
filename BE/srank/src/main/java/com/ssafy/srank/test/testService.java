package com.ssafy.srank.test;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import org.springframework.stereotype.Service;

@Service
public class testService {
    public int test(){
        return 100;
    }

    public int err(){
        throw new BusinessException(ErrorCode.CARD_NOT_FOUND);
    }
}
