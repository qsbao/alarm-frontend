package com.fabalarm.auth;

import com.fabalarm.model.User;

public final class CurrentUserHolder {

    private static final ThreadLocal<User> CURRENT_USER = new ThreadLocal<>();

    private CurrentUserHolder() {}

    public static void set(User user) {
        CURRENT_USER.set(user);
    }

    public static User get() {
        return CURRENT_USER.get();
    }

    public static void clear() {
        CURRENT_USER.remove();
    }
}
