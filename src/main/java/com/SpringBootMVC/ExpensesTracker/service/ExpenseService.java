package com.SpringBootMVC.ExpensesTracker.service;

import com.SpringBootMVC.ExpensesTracker.entity.Expense;

public interface ExpenseService {
    Expense findExpenseById(int id);
}
