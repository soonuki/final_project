package com.ware.spring.vehicle.controller;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.ware.spring.vehicle.domain.VehicleDto;
import com.ware.spring.vehicle.domain.VehicleSize;
import com.ware.spring.vehicle.repository.VehicleSalesRepository;
import com.ware.spring.vehicle.repository.VehicleSizeRepository;
import com.ware.spring.vehicle.service.VehicleService;

import lombok.RequiredArgsConstructor;
@Controller
@RequiredArgsConstructor
public class VehicleViewController {
	private final VehicleSalesRepository vehicleSalesRepository;
    private final VehicleService vehicleService;
    private final VehicleSizeRepository vehicleSizeRepository;
    private static final Logger logger = LoggerFactory.getLogger(VehicleViewController.class);

    @GetMapping("/vehicle/register")
    public String showRegisterPage(Model model) {
        // 차량 크기 목록을 모델에 추가
        model.addAttribute("vehicleSize", vehicleSizeRepository.findAll());
        return "vehicle/vehicle_register";  // 차량 등록 페이지
    }

    // 차량 목록 조회 (차량 리스트 페이지)
    @GetMapping("/vehicle/list")
    public String getVehicleList(Model model) {
        List<VehicleDto> vehicles = vehicleService.getAllVehicles();
        model.addAttribute("vehicles", vehicles);
        return "vehicle/vehicle_list"; 
    }
    
    
    @GetMapping("/vehicle/{vehicleNo}/detail")
    public String getVehicleDetail(@PathVariable("vehicleNo") Long vehicleNo, Model model) {
        VehicleDto vehicleDetail = vehicleService.getVehicleDetail(vehicleNo);
        // 판매량 합계 계산, null이면 기본값 0으로 처리
        Integer vehicleSalesCount = vehicleSalesRepository.sumSaleCountByVehicleNo(vehicleNo);
        if (vehicleSalesCount == null) {
            vehicleSalesCount = 0; // null인 경우 0으로 설정
        }
        model.addAttribute("vehicle", vehicleDetail);
        model.addAttribute("vehicleSalesCount", vehicleSalesCount); // 판매량 추가
        return "vehicle/vehicle_detail";
    }

}
