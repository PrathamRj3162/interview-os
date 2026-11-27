import java.util.*;

public class Main {
    public static void main(String[] args) {
        RateLimiter limiter = new RateLimiter();
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            try {
                switch (p[0]) {
                    case "RULE" -> limiter.rule(p[1], Integer.parseInt(p[2]), Long.parseLong(p[3]));
                    case "ALGO" -> limiter.algorithm(p[1], p[2]);
                    case "REQ" -> System.out.println(limiter.allow(p[1], Long.parseLong(p[2])) ? "ALLOW" : "DENY");
                    default -> { }
                }
            } catch (IllegalArgumentException e) {
                System.out.println("ERROR " + e.getMessage());
            }
        }
    }
}
