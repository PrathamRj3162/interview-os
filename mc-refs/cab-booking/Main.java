import java.util.*;

public class Main {
    public static void main(String[] args) {
        RideService svc = new RideService();
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            try {
                switch (p[0]) {
                    case "DRIVER" -> svc.addDriver(p[1], Double.parseDouble(p[2]), Double.parseDouble(p[3]));
                    case "RIDER" -> svc.addRider(p[1], Double.parseDouble(p[2]), Double.parseDouble(p[3]));
                    case "BOOK" -> System.out.println(svc.book(p[1], Double.parseDouble(p[2]), Double.parseDouble(p[3])));
                    case "END" -> System.out.println(svc.end(p[1]));
                    case "HISTORY" -> svc.history(p[1]).forEach(System.out::println);
                    case "SURGE" -> svc.setSurge(Double.parseDouble(p[1]));
                    default -> { }
                }
            } catch (IllegalArgumentException e) {
                System.out.println("ERROR " + e.getMessage());
            }
        }
    }
}
