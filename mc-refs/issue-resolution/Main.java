import java.util.*;

public class Main {
    public static void main(String[] args) {
        SupportDesk desk = new SupportDesk();
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            List<String> out = switch (p[0]) {
                case "AGENT" -> { desk.addAgent(p[1], Arrays.asList(p).subList(2, p.length)); yield List.of(); }
                case "ISSUE" -> desk.newIssue(p[1], p[2]);
                case "RESOLVE" -> desk.resolve(p[1]);
                case "HISTORY" -> List.of(desk.history(p[1]));
                case "LEAVE" -> desk.leave(p[1]);
                default -> List.of();
            };
            out.forEach(System.out::println);
        }
    }
}
