import java.util.*;

public class Restaurant {
    final String id;
    final int capacity;
    final double rating;
    final Map<String, Long> menu = new HashMap<>();
    int active = 0;

    Restaurant(String id, int capacity, double rating) {
        if (capacity < 1) throw new IllegalArgumentException("invalid capacity");
        this.id = id;
        this.capacity = capacity;
        this.rating = rating;
    }

    boolean canTake(String item) { return active < capacity && menu.containsKey(item); }
    long price(String item) { return menu.get(item); }
}
