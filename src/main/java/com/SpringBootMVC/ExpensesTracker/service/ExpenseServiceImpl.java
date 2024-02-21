package com.SpringBootMVC.ExpensesTracker.service;

import com.SpringBootMVC.ExpensesTracker.DTO.ExpenseDTO;
import com.SpringBootMVC.ExpensesTracker.entity.Category;
import com.SpringBootMVC.ExpensesTracker.entity.Expense;
import com.SpringBootMVC.ExpensesTracker.repository.ExpenseRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ExpenseServiceImpl implements ExpenseService {
    ExpenseRepository expenseRepository;
    ClientService clientService;
    CategoryService categoryService;

    @Autowired
    public ExpenseServiceImpl(ExpenseRepository expenseRepository, ClientService clientService, CategoryService categoryService) {
        this.expenseRepository = expenseRepository;
        this.clientService = clientService;
        this.categoryService = categoryService;
    }


    @Override
    public Expense findExpenseById(int id) {
        return expenseRepository.findById(id).orElse(null);
    }

    @Transactional
    @Override
    public void save(ExpenseDTO expenseDTO) {
        System.out.println(expenseDTO);
        Expense expense = new Expense();
        expense.setAmount(expenseDTO.getAmount());
        expense.setDateTime(expenseDTO.getDateTime());
        expense.setDescription(expenseDTO.getDescription());
        expense.setClient(clientService.findClientById(expenseDTO.getClientId()));
        Category category = categoryService.findCategoryByName(expenseDTO.getCategory());
        expense.setCategory(category);
        expenseRepository.save(expense);
    }

    @Override
    public List<Expense> findAllExpenses() {
        return expenseRepository.findAll();
    }

    @Override
    public List<Expense> findAllExpensesByClientId(int id) {
        return expenseRepository.findByClientId(id);
    }
}
