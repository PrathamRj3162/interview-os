import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RateLimiter {
    private record Rule(int limit, long window) { }

    private final Map<String, Rule> rules = new ConcurrentHashMap<>();
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public void rule(String client, int limit, long windowSeconds) {
        if (limit < 1 || windowSeconds < 1) throw new IllegalArgumentException("invalid rule");
        rules.put(client, new Rule(limit, windowSeconds));
        windows.put(client, new Window.Fixed(limit, windowSeconds));
    }

    public void algorithm(String client, String algo) {
        Rule r = rules.get(client);
        if (r == null) throw new IllegalArgumentException("unknown client " + client);
        windows.put(client, switch (algo) {
            case "FIXED" -> new Window.Fixed(r.limit(), r.window());
            case "SLIDING" -> new Window.Sliding(r.limit(), r.window());
            default -> throw new IllegalArgumentException("unknown algorithm");
        });
    }

    public boolean allow(String client, long now) {
        Window w = windows.get(client);
        return w == null || w.tryAcquire(now);
    }
}
