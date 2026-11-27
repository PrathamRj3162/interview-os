import java.util.*;

public class OrderService {
    private final Map<String, Restaurant> restaurants = new LinkedHashMap<>();
    private final Map<String, Restaurant> openOrders = new HashMap<>();
    private SelectionStrategy strategy = SelectionStrategy.PRICE;
    private int seq = 0;

    public void addRestaurant(String id, int capacity, double rating) { restaurants.put(id, new Restaurant(id, capacity, rating)); }

    public void setPrice(String rid, String item, long price) {
        Restaurant r = restaurants.get(rid);
        if (r == null) throw new IllegalArgumentException("unknown restaurant");
        if (price <= 0) throw new IllegalArgumentException("invalid price");
        r.menu.put(item, price);
    }

    public void setStrategy(String name) {
        strategy = switch (name) { case "PRICE" -> SelectionStrategy.PRICE; case "RATING" -> SelectionStrategy.RATING; default -> throw new IllegalArgumentException("unknown strategy"); };
    }

    public String order(String user, String item, int qty) {
        if (qty < 1) throw new IllegalArgumentException("invalid quantity");
        Optional<Restaurant> pick = restaurants.values().stream().filter(r -> r.canTake(item)).min(strategy.order(item));
        if (pick.isEmpty()) return "NO_RESTAURANT";
        Restaurant r = pick.get();
        r.active++;
        String id = "O" + (++seq);
        openOrders.put(id, r);
        return "ORDER " + id + " " + r.id + " " + (r.price(item) * qty);
    }

    public void delivered(String orderId) {
        Restaurant r = openOrders.remove(orderId);
        if (r == null) throw new IllegalArgumentException("unknown order");
        r.active--;
    }
}
