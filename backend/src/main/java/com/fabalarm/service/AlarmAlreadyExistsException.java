package com.fabalarm.service;

public class AlarmAlreadyExistsException extends RuntimeException {
    public AlarmAlreadyExistsException(String message) {
        super(message);
    }
}
