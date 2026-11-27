import java.util.Comparator;

/** Which entry to evict: the smallest by this order. */
public enum EvictionPolicy {
    LRU(Comparator.comparingLong(e -> e.lastUse)),
    LFU(Comparator.<Cache.Entry>comparingLong(e -> e.uses).thenComparingLong(e -> e.lastUse));

    final Comparator<Cache.Entry> victimOrder;

    EvictionPolicy(Comparator<Cache.Entry> order) { this.victimOrder = order; }
}
