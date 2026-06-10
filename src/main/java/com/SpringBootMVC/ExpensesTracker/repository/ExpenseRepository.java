package com.SpringBootMVC.ExpensesTracker.repository;

import com.SpringBootMVC.ExpensesTracker.entity.ExpenseRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface ExpenseRepository extends JpaRepository<ExpenseRecord, Long> {

	@Query("select coalesce(sum(e.amount), 0) from ExpenseRecord e where e.expenseDate between :startDate and :endDate")
	BigDecimal sumAmountBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

	@Query("select coalesce(sum(e.amount), 0) from ExpenseRecord e where e.expenseDate between :startDate and :endDate and e.id <> :excludeId")
	BigDecimal sumAmountBetweenExcludingId(
		@Param("startDate") LocalDate startDate,
		@Param("endDate") LocalDate endDate,
		@Param("excludeId") Long excludeId
	);
}
