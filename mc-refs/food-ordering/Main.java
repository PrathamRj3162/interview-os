import java.util.*;

public class Main {
    public static void main(String[] args) {
        OrderService svc = new OrderService();
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            try {
                switch (p[0]) {
                    case "RESTAURANT" -> svc.addRestaurant(p[1], Integer.parseInt(p[2]), Double.parseDouble(p[3]));
                    case "MENU" -> svc.setPrice(p[1], p[2], Long.parseLong(p[3]));
                    case "ORDER" -> System.out.println(svc.order(p[1], p[2], Integer.parseInt(p[3])));
                    case "DELIVERED" -> svc.delivered(p[1]);
                    case "STRATEGY" -> svc.setStrategy(p[1]);
                    default -> { }
                }
            } catch (IllegalArgumentException e) {
                System.out.println("ERROR " + e.getMessage());
            }
        }
    }
}
