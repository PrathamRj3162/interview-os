import java.util.*;

public class Main {
    public static void main(String[] args) {
        Board game = null;
        Map<Character, String> names = new HashMap<>();
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            switch (p[0]) {
                case "NEW" -> { int n = Integer.parseInt(p[1]); game = new Board(n, p.length > 2 ? Integer.parseInt(p[2]) : n); }
                case "PLAYER" -> names.put(p[1].charAt(0), p[2]);
                case "PRINT" -> game.rows().forEach(System.out::println);
                case "MOVE" -> {
                    if (game.isOver()) { System.out.println("ERROR game over"); continue; }
                    char mark = game.current();
                    String who = names.getOrDefault(mark, String.valueOf(mark));
                    Board.Result r = game.move(Integer.parseInt(p[1]), Integer.parseInt(p[2]));
                    if (r == Board.Result.INVALID) { System.out.println("ERROR invalid move"); continue; }
                    System.out.println(who + " placed " + mark + " at " + p[1] + " " + p[2]);
                    if (r == Board.Result.WIN) System.out.println(who + " won");
                    if (r == Board.Result.DRAW) System.out.println("Game drawn");
                }
                default -> { }
            }
        }
    }
}
