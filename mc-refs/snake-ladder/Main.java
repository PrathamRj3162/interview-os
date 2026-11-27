import java.util.*;

public class Main {
    public static void main(String[] args) {
        Game game = null;
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            try {
                switch (p[0]) {
                    case "BOARD" -> game = new Game(Integer.parseInt(p[1]));
                    case "SNAKE" -> game.addJump(Integer.parseInt(p[1]), Integer.parseInt(p[2]), true);
                    case "LADDER" -> game.addJump(Integer.parseInt(p[1]), Integer.parseInt(p[2]), false);
                    case "PLAYER" -> game.addPlayer(p[1]);
                    case "RULE" -> { if (p[1].equals("SIX")) game.enableSixRule(); }
                    case "ROLL" -> game.roll(Integer.parseInt(p[1])).forEach(System.out::println);
                    default -> { }
                }
            } catch (IllegalArgumentException | IllegalStateException e) {
                System.out.println("ERROR " + e.getMessage());
            }
        }
    }
}
