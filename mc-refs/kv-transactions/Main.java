import java.util.*;

public class Main {
    public static void main(String[] args) {
        Store db = new Store();
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            switch (p[0]) {
                case "SET" -> db.set(p[1], p[2]);
                case "GET" -> System.out.println(db.get(p[1]).orElse("NULL"));
                case "DELETE" -> db.delete(p[1]);
                case "COUNT" -> System.out.println(db.count(p[1]));
                case "BEGIN" -> { if (!db.begin()) System.out.println("ERROR nested"); }
                case "COMMIT" -> { if (!db.commit()) System.out.println("NO TRANSACTION"); }
                case "ROLLBACK" -> { if (!db.rollback()) System.out.println("NO TRANSACTION"); }
                case "NESTED" -> db.allowNested(p.length > 1 && p[1].equals("ON"));
                default -> { }
            }
        }
    }
}
