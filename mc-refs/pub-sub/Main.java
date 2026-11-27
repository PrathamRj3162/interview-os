import java.util.*;

public class Main {
    public static void main(String[] args) {
        Broker broker = new Broker(line -> System.out.println(line));
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+", 3);
            if (p[0].isEmpty()) continue;
            try {
                switch (p[0]) {
                    case "TOPIC" -> broker.createTopic(p[1]);
                    case "SUBSCRIBE" -> broker.subscribe(p[1], p[2]);
                    case "UNSUBSCRIBE" -> broker.unsubscribe(p[1], p[2]);
                    case "PUBLISH" -> broker.publish(p[1], p[2]);
                    case "REPLAY" -> {
                        String[] q = p[2].split("\\s+");
                        broker.replay(p[1], q[0], Integer.parseInt(q[1]));
                    }
                    default -> { }
                }
            } catch (IllegalArgumentException e) {
                System.out.println("ERROR " + e.getMessage());
            }
        }
    }
}
