import java.util.*;

/** Users and the pairwise ledger: net[a][b] > 0 means a owes b. */
public class ExpenseService {
    private final Set<String> users = new LinkedHashSet<>();
    private final Map<String, Map<String, Long>> owes = new TreeMap<>();

    public void addUser(String id) {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("invalid user");
        users.add(id);
    }

    /** EXPENSE paidBy amount n u1..un TYPE args... */
    public void addExpense(String[] p) {
        if (p.length < 5) throw new IllegalArgumentException("invalid amount");
        String payer = p[1];
        requireUser(payer);
        long amount = Splits.paise(p[2]);
        int n;
        try { n = Integer.parseInt(p[3]); } catch (NumberFormatException e) { throw new IllegalArgumentException("invalid amount"); }
        if (n <= 0 || p.length < 5 + n) throw new IllegalArgumentException("invalid amount");
        List<String> members = Arrays.asList(p).subList(4, 4 + n);
        members.forEach(this::requireUser);
        SplitStrategy strategy = Splits.of(p[4 + n]);
        long[] shares = strategy.shares(amount, n, Arrays.asList(p).subList(5 + n, p.length));
        for (int i = 0; i < n; i++) record(members.get(i), payer, shares[i]);
    }

    private void record(String debtor, String creditor, long paise) {
        if (debtor.equals(creditor) || paise == 0) return;
        add(debtor, creditor, paise);
        add(creditor, debtor, -paise);
    }

    private void add(String a, String b, long v) {
        owes.computeIfAbsent(a, k -> new TreeMap<>()).merge(b, v, Long::sum);
    }

    private void requireUser(String id) {
        if (!users.contains(id)) throw new IllegalArgumentException("unknown user " + id);
    }

    public List<String> allBalances() {
        List<String> out = new ArrayList<>();
        owes.forEach((a, m) -> m.forEach((b, v) -> { if (v > 0) out.add(line(a, b, v)); }));
        return out;
    }

    public List<String> balancesFor(String user) {
        requireUser(user);
        List<String> out = new ArrayList<>();
        owes.forEach((a, m) -> m.forEach((b, v) -> { if (v > 0 && (a.equals(user) || b.equals(user))) out.add(line(a, b, v)); }));
        return out;
    }

    private static String line(String a, String b, long paise) {
        return String.format("%s owes %s: %d.%02d", a, b, paise / 100, paise % 100);
    }
}
