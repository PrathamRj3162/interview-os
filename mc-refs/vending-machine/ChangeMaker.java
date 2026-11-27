import java.util.*;

/** Coins held for change. Greedy, largest coin first, as the contract specifies. */
public class ChangeMaker {
    static final int[] DENOMINATIONS = {20, 10, 5, 2, 1};
    private final Map<Integer, Integer> pool = new HashMap<>();

    void add(int coin, int count) { pool.merge(coin, count, Integer::sum); }
    void addAll(List<Integer> coins) { coins.forEach(c -> add(c, 1)); }
    void removeAll(List<Integer> coins) { coins.forEach(c -> pool.merge(c, -1, Integer::sum)); }

    /** The coins to give, or empty if exact change can't be made greedily. */
    Optional<List<Integer>> make(int amount) {
        List<Integer> give = new ArrayList<>();
        Map<Integer, Integer> left = new HashMap<>(pool);
        for (int d : DENOMINATIONS) {
            while (amount >= d && left.getOrDefault(d, 0) > 0) { amount -= d; left.merge(d, -1, Integer::sum); give.add(d); }
        }
        return amount == 0 ? Optional.of(give) : Optional.empty();
    }
}
