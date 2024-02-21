package com.SpringBootMVC.ExpensesTracker.controller;

import com.SpringBootMVC.ExpensesTracker.DTO.ExpenseDTO;
import com.SpringBootMVC.ExpensesTracker.entity.Client;
import com.SpringBootMVC.ExpensesTracker.entity.Expense;
import com.SpringBootMVC.ExpensesTracker.service.CategoryService;
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

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Controller
public class MainController {
    ExpenseService expenseService;
    CategoryService categoryService;

    @Autowired
    public MainController(ExpenseService expenseService, CategoryService categoryService) {
        this.expenseService = expenseService;
        this.categoryService = categoryService;
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

    @GetMapping("/list")
    public String list(Model model, HttpSession session){
        Client client = (Client) session.getAttribute("client");
        int clientId = client.getId();
        List<Expense> expenseList = expenseService.findAllExpensesByClientId(clientId);
        for (Expense expense : expenseList){
            expense.setCategoryName(categoryService.findCategoryById(expense.getCategory().getId()).getName());
            expense.setDate(LocalDateTime.parse(expense.getDateTime(), DateTimeFormatter.ISO_LOCAL_DATE_TIME).toLocalDate().toString());
            expense.setTime(LocalDateTime.parse(expense.getDateTime(), DateTimeFormatter.ISO_LOCAL_DATE_TIME).toLocalTime().toString());
        }
        model.addAttribute("expenseList", expenseList);
        return "list-page";
    }


}
