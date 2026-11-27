import java.util.*;

public class Main {
    public static void main(String[] args) {
        VendingMachine m = new VendingMachine();
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            List<String> out = switch (p[0]) {
                case "STOCK" -> { m.stock(p[1], p[2], Integer.parseInt(p[3]), Integer.parseInt(p[4])); yield List.of(); }
                case "INSERT" -> m.insert(Integer.parseInt(p[1]));
                case "SELECT" -> m.select(p[1]);
                case "CANCEL" -> m.cancel();
                case "LOAD" -> { m.load(Integer.parseInt(p[1]), Integer.parseInt(p[2])); yield List.of(); }
                default -> List.of();
            };
            out.forEach(System.out::println);
        }
    }
}
