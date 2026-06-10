package com.SpringBootMVC.ExpensesTracker.controller;

import com.SpringBootMVC.ExpensesTracker.DTO.ExpensePayload;
import com.SpringBootMVC.ExpensesTracker.entity.ExpenseRecord;
import com.SpringBootMVC.ExpensesTracker.repository.ExpenseRepository;
import com.SpringBootMVC.ExpensesTracker.repository.MonthlyBudgetRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseApiController {

    private final ExpenseRepository expenseRepository;
    private final MonthlyBudgetRepository budgetRepository;

    public ExpenseApiController(ExpenseRepository expenseRepository, MonthlyBudgetRepository budgetRepository) {
        this.expenseRepository = expenseRepository;
        this.budgetRepository = budgetRepository;
    }

    @GetMapping
    public List<ExpenseRecord> list() {
        return expenseRepository.findAll().stream()
            .sorted(Comparator.comparing(ExpenseRecord::getExpenseDate).reversed()
                .thenComparing(ExpenseRecord::getId, Comparator.reverseOrder()))
            .toList();
    }

    @PostMapping
    public ResponseEntity<ExpenseRecord> create(@Valid @RequestBody ExpensePayload payload) {
        enforceMonthlyBudget(payload.getDate(), payload.getAmount(), null);
        ExpenseRecord record = new ExpenseRecord();
        mapPayload(record, payload);
        return ResponseEntity.status(HttpStatus.CREATED).body(expenseRepository.save(record));
    }

    @PutMapping("/{id}")
    public ExpenseRecord update(@PathVariable Long id, @Valid @RequestBody ExpensePayload payload) {
        ExpenseRecord existing = expenseRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));

        enforceMonthlyBudget(payload.getDate(), payload.getAmount(), existing.getId());
        mapPayload(existing, payload);
        return expenseRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!expenseRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        expenseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAll() {
        expenseRepository.deleteAllInBatch();
        return ResponseEntity.noContent().build();
    }

    private void mapPayload(ExpenseRecord record, ExpensePayload payload) {
        record.setTitle(payload.getTitle().trim());
        record.setAmount(payload.getAmount());
        record.setExpenseDate(payload.getDate());
        record.setCategory(payload.getCategory().trim());
        record.setPaymentMethod(payload.getPaymentMethod().trim());
        record.setNotes(payload.getNotes() == null ? "" : payload.getNotes().trim());
        record.setRecurring(payload.isRecurring());
    }

    private void enforceMonthlyBudget(LocalDate expenseDate, BigDecimal amount, Long excludeId) {
        YearMonth month = YearMonth.from(expenseDate);
        String monthKey = month.toString();

        BigDecimal budgetAmount = budgetRepository.findByMonthKey(monthKey)
            .map(item -> item.getBudgetAmount())
            .orElse(BigDecimal.ZERO);

        if (budgetAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        BigDecimal monthSpent = excludeId == null
            ? expenseRepository.sumAmountBetween(month.atDay(1), month.atEndOfMonth())
            : expenseRepository.sumAmountBetweenExcludingId(month.atDay(1), month.atEndOfMonth(), excludeId);

        BigDecimal projected = monthSpent.add(amount);
        if (projected.compareTo(budgetAmount) > 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Monthly budget exceeded. Increase monthly budget to add this expense."
            );
        }
    }
}
