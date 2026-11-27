import java.util.*;

/**
 * Writes go straight to the data; each open transaction keeps an undo log (the value each key had before its
 * first change in that transaction). Rollback replays the innermost log; commit drops all logs. COUNT uses a
 * value → count index kept in step with every write.
 */
public class Store {
    private final Map<String, String> data = new HashMap<>();
    private final Map<String, Integer> counts = new HashMap<>();
    private final Deque<Map<String, Optional<String>>> undo = new ArrayDeque<>();
    private boolean nested = false;

    public synchronized Optional<String> get(String k) { return Optional.ofNullable(data.get(k)); }
    public synchronized int count(String v) { return counts.getOrDefault(v, 0); }
    public synchronized void allowNested(boolean on) { nested = on; }

    public synchronized void set(String k, String v) { remember(k); write(k, v); }
    public synchronized void delete(String k) { remember(k); write(k, null); }

    private void remember(String k) {
        if (!undo.isEmpty()) undo.peek().putIfAbsent(k, Optional.ofNullable(data.get(k)));
    }

    private void write(String k, String v) {
        String old = v == null ? data.remove(k) : data.put(k, v);
        if (old != null) counts.merge(old, -1, Integer::sum);
        if (v != null) counts.merge(v, 1, Integer::sum);
    }

    public synchronized boolean begin() {
        if (!undo.isEmpty() && !nested) return false;
        undo.push(new HashMap<>());
        return true;
    }

    public synchronized boolean commit() {
        if (undo.isEmpty()) return false;
        undo.clear();
        return true;
    }

    public synchronized boolean rollback() {
        if (undo.isEmpty()) return false;
        undo.pop().forEach((k, v) -> write(k, v.orElse(null)));
        return true;
    }
}
