import java.util.*;

public class Main {
    public static void main(String[] args) {
        Cache cache = null;
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            switch (p[0]) {
                case "CAPACITY" -> cache = new Cache(Integer.parseInt(p[1]));
                case "PUT" -> cache.put(p[1], p[2]).ifPresent(k -> System.out.println("EVICT " + k));
                case "GET" -> System.out.println(cache.get(p[1]).orElse("MISS"));
                case "POLICY" -> cache.setPolicy(EvictionPolicy.valueOf(p[1]));
                default -> { }
            }
        }
    }
}
