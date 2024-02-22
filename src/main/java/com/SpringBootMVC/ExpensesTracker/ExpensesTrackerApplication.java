package com.SpringBootMVC.ExpensesTracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.time.LocalDateTime;
import java.time.Month;

@SpringBootApplication
public class ExpensesTrackerApplication {

	public static void main(String[] args) {
		SpringApplication.run(ExpensesTrackerApplication.class, args);

//		LocalDateTime localDateTime = LocalDateTime.of(2022, 4, 5, 11, 05);
//		System.out.println(localDateTime.getMonth());
//		System.out.println(localDateTime.getYear());

		System.out.println("2024-02-01T11:28".substring(0,4));
		System.out.println("2024-02-01T11:28".substring(5,7));
	}

}
