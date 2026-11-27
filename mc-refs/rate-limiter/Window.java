import java.util.ArrayDeque;
import java.util.Deque;

/** One client's limiting state. Implementations are synchronized so a limiter can be shared across threads. */
public interface Window {
    boolean tryAcquire(long now);

    final class Fixed implements Window {
        private final int limit; private final long size; private long windowStart = Long.MIN_VALUE; private int count = 0;
        Fixed(int limit, long size) { this.limit = limit; this.size = size; }
        public synchronized boolean tryAcquire(long now) {
            long start = (now / size) * size;
            if (start != windowStart) { windowStart = start; count = 0; }
            if (count >= limit) return false;
            count++;
            return true;
        }
    }

    final class Sliding implements Window {
        private final int limit; private final long size; private final Deque<Long> allowed = new ArrayDeque<>();
        Sliding(int limit, long size) { this.limit = limit; this.size = size; }
        public synchronized boolean tryAcquire(long now) {
            while (!allowed.isEmpty() && now - allowed.peekFirst() >= size) allowed.pollFirst();
            if (allowed.size() >= limit) return false;
            allowed.addLast(now);
            return true;
        }
    }
}
