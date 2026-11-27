import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * Topics with an append-only message log and ordered subscriber lists. Thread-safe collections, so publishing
 * from several threads is safe; delivery here is synchronous through the sink.
 */
public class Broker {
    private static final class Topic {
        final List<String> log = new CopyOnWriteArrayList<>();
        final Set<String> subscribers = Collections.synchronizedSet(new LinkedHashSet<>());
    }

    private final Map<String, Topic> topics = new ConcurrentHashMap<>();
    private final Consumer<String> sink;

    public Broker(Consumer<String> sink) { this.sink = sink; }

    public void createTopic(String name) { topics.putIfAbsent(name, new Topic()); }

    private Topic topic(String name) {
        Topic t = topics.get(name);
        if (t == null) throw new IllegalArgumentException("unknown topic " + name);
        return t;
    }

    public void subscribe(String sub, String topic) { topic(topic).subscribers.add(sub); }
    public void unsubscribe(String sub, String topic) { topic(topic).subscribers.remove(sub); }

    public void publish(String topic, String message) {
        Topic t = topic(topic);
        t.log.add(message);
        List<String> subs;
        synchronized (t.subscribers) { subs = new ArrayList<>(t.subscribers); }
        if (subs.isEmpty()) { sink.accept("(no subscribers)"); return; }
        for (String s : subs) sink.accept(s + " <- " + message);
    }

    public void replay(String sub, String topic, int offset) {
        Topic t = topic(topic);
        if (offset < 0) throw new IllegalArgumentException("invalid offset");
        if (offset >= t.log.size()) { sink.accept("(nothing to replay)"); return; }
        for (String m : t.log.subList(offset, t.log.size())) sink.accept(sub + " <- " + m);
    }
}
