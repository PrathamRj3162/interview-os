import java.util.*;

public class Scheduler {
    private record Task(String id, int priority, int duration, long seq, String after) { }

    private final List<Task> waiting = new ArrayList<>();
    private final Set<String> known = new HashSet<>(), done = new HashSet<>();
    private Task running;
    private long now = 0, finishAt = 0, seq = 0;

    public void add(String id, int priority, int duration, String after) {
        if (duration < 1) throw new IllegalArgumentException("invalid duration");
        if (after != null && !known.contains(after)) throw new IllegalArgumentException("unknown dependency");
        known.add(id);
        waiting.add(new Task(id, priority, duration, seq++, after));
    }

    private Optional<Task> best() {
        return waiting.stream()
                .filter(t -> t.after() == null || done.contains(t.after()))
                .min(Comparator.comparingInt((Task t) -> -t.priority()).thenComparingLong(Task::seq));
    }

    private void startIfIdle(long at) {
        if (running != null) return;
        best().ifPresent(t -> { waiting.remove(t); running = t; finishAt = at + t.duration(); });
    }

    public List<String> tick(int units) {
        if (units < 0) throw new IllegalArgumentException("invalid tick");
        List<String> out = new ArrayList<>();
        long end = now + units;
        startIfIdle(now);
        while (running != null && finishAt <= end) {
            out.add("t=" + finishAt + " DONE " + running.id());
            done.add(running.id());
            long at = finishAt;
            running = null;
            startIfIdle(at);
        }
        now = end;
        return out;
    }

    public List<String> status() {
        return List.of(running == null ? "IDLE" : "RUNNING " + running.id(), "WAITING " + waiting.size());
    }
}
