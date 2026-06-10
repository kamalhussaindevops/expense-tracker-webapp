package com.SpringBootMVC.ExpensesTracker.controller;

import com.SpringBootMVC.ExpensesTracker.DTO.BudgetPayload;
import com.SpringBootMVC.ExpensesTracker.entity.MonthlyBudget;
import com.SpringBootMVC.ExpensesTracker.repository.ExpenseRepository;
import com.SpringBootMVC.ExpensesTracker.repository.MonthlyBudgetRepository;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/budget")
public class BudgetApiController {

    private final MonthlyBudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;

    public BudgetApiController(MonthlyBudgetRepository budgetRepository, ExpenseRepository expenseRepository) {
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
    }

    @GetMapping("/current")
    public Map<String, Object> getCurrentBudget(@RequestParam(required = false) String month) {
        YearMonth target = month == null || month.isBlank() ? YearMonth.now() : YearMonth.parse(month);
        return buildBudgetSummary(target);
    }

    @PutMapping("/current")
    public Map<String, Object> upsertCurrentBudget(
        @RequestParam(required = false) String month,
        @Valid @RequestBody BudgetPayload payload
    ) {
        YearMonth target = month == null || month.isBlank() ? YearMonth.now() : YearMonth.parse(month);
        String monthKey = target.toString();

        MonthlyBudget monthlyBudget = budgetRepository.findByMonthKey(monthKey).orElseGet(MonthlyBudget::new);
        monthlyBudget.setMonthKey(monthKey);
        monthlyBudget.setBudgetAmount(payload.getAmount());
        budgetRepository.save(monthlyBudget);

        return buildBudgetSummary(target);
    }

    private Map<String, Object> buildBudgetSummary(YearMonth yearMonth) {
        String monthKey = yearMonth.toString();
        BigDecimal budget = budgetRepository.findByMonthKey(monthKey)
            .map(MonthlyBudget::getBudgetAmount)
            .orElse(BigDecimal.ZERO);

        LocalDate start = yearMonth.atDay(1);
        LocalDate end = yearMonth.atEndOfMonth();
        BigDecimal spent = expenseRepository.sumAmountBetween(start, end);
        BigDecimal remaining = budget.subtract(spent);

        Map<String, Object> summary = new HashMap<>();
        summary.put("month", monthKey);
        summary.put("budget", budget);
        summary.put("spent", spent);
        summary.put("remaining", remaining);
        summary.put("locked", budget.compareTo(BigDecimal.ZERO) > 0 && remaining.compareTo(BigDecimal.ZERO) <= 0);
        return summary;
    }
}
