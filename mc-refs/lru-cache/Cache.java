import java.util.*;

/** Reference cache. Eviction scans entries (fine for a reference; an O(1) LRU uses a linked hash map). */
public class Cache {
    static final class Entry { final String key; String value; long lastUse, uses; Entry(String k) { key = k; } }

    private final int capacity;
    private final Map<String, Entry> entries = new HashMap<>();
    private EvictionPolicy policy = EvictionPolicy.LRU;
    private long clock = 0;

    public Cache(int capacity) {
        if (capacity < 1) throw new IllegalArgumentException("invalid capacity");
        this.capacity = capacity;
    }

    public void setPolicy(EvictionPolicy p) { policy = p; }

    private void touch(Entry e) { e.lastUse = ++clock; e.uses++; }

    public Optional<String> put(String key, String value) {
        Entry e = entries.get(key);
        if (e != null) { e.value = value; touch(e); return Optional.empty(); }
        Optional<String> evicted = Optional.empty();
        if (entries.size() == capacity) {
            Entry victim = Collections.min(entries.values(), policy.victimOrder);
            entries.remove(victim.key);
            evicted = Optional.of(victim.key);
        }
        e = new Entry(key);
        e.value = value;
        touch(e);
        entries.put(key, e);
        return evicted;
    }

    public Optional<String> get(String key) {
        Entry e = entries.get(key);
        if (e == null) return Optional.empty();
        touch(e);
        return Optional.of(e.value);
    }
}
