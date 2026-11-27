import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scheduler s = new Scheduler();
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            try {
                switch (p[0]) {
                    case "ADD" -> s.add(p[1], Integer.parseInt(p[2]), Integer.parseInt(p[3]), p.length > 5 && p[4].equals("AFTER") ? p[5] : null);
                    case "TICK" -> s.tick(Integer.parseInt(p[1])).forEach(System.out::println);
                    case "STATUS" -> s.status().forEach(System.out::println);
                    default -> { }
                }
            } catch (IllegalArgumentException e) {
                System.out.println("ERROR " + e.getMessage());
            }
        }
    }
}
