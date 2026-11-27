import java.util.*;

public class VendingMachine {
    private static final Set<Integer> COINS = Set.of(1, 2, 5, 10, 20);
    private static final class Product { final String name; final int price; int qty; Product(String n, int p, int q) { name = n; price = p; qty = q; } }

    private final Map<String, Product> products = new HashMap<>();
    private final List<Integer> inserted = new ArrayList<>();
    private int balance = 0;
    private ChangeMaker change; // null until LOAD is used: unlimited change

    public void stock(String code, String name, int price, int qty) {
        if (price <= 0 || qty < 0) throw new IllegalArgumentException("invalid stock");
        Product p = products.get(code);
        if (p == null) products.put(code, new Product(name, price, qty)); else p.qty += qty;
    }

    public void load(int coin, int count) {
        if (!COINS.contains(coin) || count < 0) return;
        if (change == null) change = new ChangeMaker();
        change.add(coin, count);
    }

    public List<String> insert(int coin) {
        if (!COINS.contains(coin)) return List.of("ERROR invalid coin");
        balance += coin;
        inserted.add(coin);
        if (change != null) change.add(coin, 1);
        return List.of("BALANCE " + balance);
    }

    public List<String> select(String code) {
        Product p = products.get(code);
        if (p == null) return List.of("UNKNOWN PRODUCT");
        if (p.qty == 0) return List.of("SOLD OUT");
        if (balance < p.price) return List.of("INSUFFICIENT FUNDS " + (p.price - balance));
        int due = balance - p.price;
        if (change != null) {
            Optional<List<Integer>> coins = change.make(due);
            if (coins.isEmpty()) {
                List<String> out = new ArrayList<>(List.of("EXACT CHANGE ONLY"));
                out.addAll(cancel());
                return out;
            }
            change.removeAll(coins.get());
        }
        p.qty--;
        balance = 0;
        inserted.clear();
        return List.of("DISPENSE " + p.name, "CHANGE " + due);
    }

    public List<String> cancel() {
        int refund = balance;
        if (change != null) change.removeAll(inserted);
        balance = 0;
        inserted.clear();
        return List.of("REFUND " + refund);
    }
}
