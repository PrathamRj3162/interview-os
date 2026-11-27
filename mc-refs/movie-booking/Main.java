import java.util.*;

public class Main {
    public static void main(String[] args) {
        BookingService svc = new BookingService();
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            try {
                switch (p[0]) {
                    case "SHOW" -> svc.addShow(p[1], Integer.parseInt(p[2]), Integer.parseInt(p[3]));
                    case "HOLD" -> System.out.println("HOLD " + svc.hold(p[1], p[2], Arrays.asList(p).subList(3, p.length)));
                    case "CONFIRM" -> svc.confirm(p[1]).forEach(System.out::println);
                    case "RELEASE" -> svc.release(p[1]);
                    case "TICK" -> svc.tick(Integer.parseInt(p[1]));
                    case "AVAILABLE" -> System.out.println(svc.available(p[1]));
                    case "PRICE" -> svc.price(p[1], p[2].charAt(0), Integer.parseInt(p[3]));
                    default -> { }
                }
            } catch (IllegalArgumentException | IllegalStateException e) {
                System.out.println("ERROR " + e.getMessage());
            }
        }
    }
}
