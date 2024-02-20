package com.SpringBootMVC.ExpensesTracker.service;

import com.SpringBootMVC.ExpensesTracker.entity.User;

public interface UserService {
    User findUserByUserName(String username);
}
