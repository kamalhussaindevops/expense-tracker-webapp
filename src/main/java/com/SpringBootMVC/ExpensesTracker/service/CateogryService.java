package com.SpringBootMVC.ExpensesTracker.service;

import com.SpringBootMVC.ExpensesTracker.entity.Cateogry;

public interface CateogryService {
    Cateogry findCateogryByName(String name);
    Cateogry findCateogryById(int id);
}
