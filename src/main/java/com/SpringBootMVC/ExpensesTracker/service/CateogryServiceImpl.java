package com.SpringBootMVC.ExpensesTracker.service;

import com.SpringBootMVC.ExpensesTracker.entity.Cateogry;
import com.SpringBootMVC.ExpensesTracker.repository.CateogryRepository;
import org.springframework.beans.factory.annotation.Autowired;

public class CateogryServiceImpl implements CateogryService {
    CateogryRepository cateogryRepository;

    @Autowired
    public CateogryServiceImpl(CateogryRepository cateogryRepository) {
        this.cateogryRepository = cateogryRepository;
    }

    @Override
    public Cateogry findCateogryByName(String name) {
        return cateogryRepository.findByName(name);
    }

    @Override
    public Cateogry findCateogryById(int id) {
        return cateogryRepository.findById(id).orElse(null);
    }
}
