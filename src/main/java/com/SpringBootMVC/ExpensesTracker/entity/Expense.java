package com.SpringBootMVC.ExpensesTracker.entity;

import jakarta.persistence.*;

@Entity
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    @Column(name = "amount")
    private int amount;
    @Column(name = "date_time")
    private String dateTime;
    @Column(name = "description", length = 400)
    private String description;

    @ManyToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "client_id")
    Client client;

    @ManyToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "cateogry_id")
    Cateogry cateogry;

    public Expense() {
    }

    public Expense(int amount, String dateTime, String description, Client client, Cateogry cateogry) {
        this.amount = amount;
        this.dateTime = dateTime;
        this.description = description;
        this.client = client;
        this.cateogry = cateogry;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getAmount() {
        return amount;
    }

    public void setAmount(int amount) {
        this.amount = amount;
    }

    public String getDateTime() {
        return dateTime;
    }

    public void setDateTime(String dateTime) {
        this.dateTime = dateTime;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Client getClient() {
        return client;
    }

    public void setClient(Client client) {
        this.client = client;
    }

    public Cateogry getCateogry() {
        return cateogry;
    }

    public void setCateogry(Cateogry cateogry) {
        this.cateogry = cateogry;
    }
}
