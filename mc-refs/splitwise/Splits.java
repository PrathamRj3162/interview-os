import java.util.List;

final class Splits {
    static long paise(String s) {
        try {
            java.math.BigDecimal d = new java.math.BigDecimal(s);
            if (d.signum() <= 0 || d.scale() > 2) throw new IllegalArgumentException("invalid amount");
            return d.movePointRight(2).longValueExact();
        } catch (NumberFormatException | ArithmeticException e) {
            throw new IllegalArgumentException("invalid amount");
        }
    }

    static final SplitStrategy EQUAL = (amount, n, args) -> {
        long[] s = new long[n];
        for (int i = 0; i < n; i++) s[i] = amount / n;
        s[0] += amount % n;
        return s;
    };

    static final SplitStrategy EXACT = (amount, n, args) -> {
        if (args.size() != n) throw new IllegalArgumentException("amounts do not add up");
        long[] s = new long[n];
        long sum = 0;
        for (int i = 0; i < n; i++) { s[i] = paise(args.get(i)); sum += s[i]; }
        if (sum != amount) throw new IllegalArgumentException("amounts do not add up");
        return s;
    };

    static final SplitStrategy PERCENT = (amount, n, args) -> {
        if (args.size() != n) throw new IllegalArgumentException("percents do not add up to 100");
        long[] s = new long[n];
        double total = 0;
        long given = 0;
        for (int i = 0; i < n; i++) {
            double pct = Double.parseDouble(args.get(i));
            if (pct < 0) throw new IllegalArgumentException("percents do not add up to 100");
            total += pct;
            s[i] = (long) Math.floor(amount * pct / 100.0);
            given += s[i];
        }
        if (Math.abs(total - 100.0) > 1e-9) throw new IllegalArgumentException("percents do not add up to 100");
        s[0] += amount - given;
        return s;
    };

    static SplitStrategy of(String type) {
        return switch (type) {
            case "EQUAL" -> EQUAL;
            case "EXACT" -> EXACT;
            case "PERCENT" -> PERCENT;
            default -> throw new IllegalArgumentException("invalid amount");
        };
    }

    private Splits() { }
}
