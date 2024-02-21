package com.SpringBootMVC.ExpensesTracker.controller;

import com.SpringBootMVC.ExpensesTracker.DTO.ExpenseDTO;
import com.SpringBootMVC.ExpensesTracker.entity.Client;
import com.SpringBootMVC.ExpensesTracker.service.ExpenseService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
public class MainController {
    ExpenseService expenseService;

    @Autowired
    public MainController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @GetMapping("/")
    public String landingPage(){
        return "landing-page";
    }

    @GetMapping("/showAdd")
    public String addExpense(Model model){
        model.addAttribute("expense", new ExpenseDTO());
        return "add-expense";
    }

    @PostMapping("/submitAdd")
    public String submitAdd(@ModelAttribute("expense") ExpenseDTO expenseDTO, HttpSession session){
        Client client = (Client) session.getAttribute("client");
        expenseDTO.setClientId(client.getId());
        expenseService.save(expenseDTO);
        return "redirect:/list";
    }


}
