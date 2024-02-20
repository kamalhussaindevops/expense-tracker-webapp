package com.SpringBootMVC.ExpensesTracker.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SignupController {

    @GetMapping("/showRegistrationForm")
    public String showRegistrationForm(){
        return "registration-page";
    }
}
