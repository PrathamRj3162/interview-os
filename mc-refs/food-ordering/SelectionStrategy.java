import java.util.Comparator;

/** Orders candidate restaurants for an item; the first one wins. */
public interface SelectionStrategy {
    Comparator<Restaurant> order(String item);

    SelectionStrategy PRICE = item -> Comparator.<Restaurant>comparingLong(r -> r.price(item))
            .thenComparing(Comparator.comparingDouble((Restaurant r) -> r.rating).reversed())
            .thenComparing(r -> r.id);

    SelectionStrategy RATING = item -> Comparator.comparingDouble((Restaurant r) -> r.rating).reversed()
            .thenComparingLong(r -> r.price(item))
            .thenComparing(r -> r.id);
}
