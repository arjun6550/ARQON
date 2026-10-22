package com.arqon.core.invitation.mail;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;

@Component
public class RealtimeMailOutbox {

    private static final int MAX_HISTORY = 150;
    private final ConcurrentLinkedDeque<RealtimeMailMessage> queue = new ConcurrentLinkedDeque<>();

    public void record(RealtimeMailMessage message) {
        queue.addFirst(message);
        while (queue.size() > MAX_HISTORY) {
            queue.pollLast();
        }
    }

    public List<RealtimeMailMessage> getAllRecent() {
        return Collections.unmodifiableList(new ArrayList<>(queue));
    }

    public void clear() {
        queue.clear();
    }
}
