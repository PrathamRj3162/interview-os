import java.util.*;

public class Game {
    private final int size;
    private final Map<Integer, Integer> snakes = new HashMap<>(), ladders = new HashMap<>();
    private final List<String> players = new ArrayList<>();
    private final Map<String, Integer> position = new HashMap<>();
    private int turn = 0;
    private boolean over = false;
    private boolean sixRule = false;
    private int sixes = 0;
    private int turnStart = -1;

    public Game(int size) {
        if (size < 2) throw new IllegalArgumentException("invalid board");
        this.size = size;
    }

    public void addJump(int from, int to, boolean snake) {
        boolean ok = from >= 1 && from <= size && to >= 1 && to <= size && (snake ? to < from : to > from);
        if (!ok) throw new IllegalArgumentException(snake ? "invalid snake" : "invalid ladder");
        (snake ? snakes : ladders).put(from, to);
    }

    public void addPlayer(String name) {
        players.add(name);
        position.put(name, 0);
    }

    public void enableSixRule() { sixRule = true; }

    public List<String> roll(int d) {
        if (over) throw new IllegalStateException("game over");
        if (players.isEmpty() || d < 1 || d > 6) throw new IllegalArgumentException("invalid roll");
        String name = players.get(turn);
        int from = position.get(name);
        if (sixes == 0) turnStart = from;
        if (sixRule && d == 6 && ++sixes == 3) {
            position.put(name, turnStart);
            sixes = 0;
            advanceTurn();
            return List.of(name + " rolled three sixes — turn cancelled");
        }
        int to = from + d <= size ? from + d : from;
        StringBuilder line = new StringBuilder(name + " rolled " + d + " and moved from " + from + " to " + to);
        if (snakes.containsKey(to)) { to = snakes.get(to); line.append(" — snake to ").append(to); }
        else if (ladders.containsKey(to)) { to = ladders.get(to); line.append(" — ladder to ").append(to); }
        position.put(name, to);
        List<String> out = new ArrayList<>(List.of(line.toString()));
        if (to == size) { over = true; out.add(name + " wins"); return out; }
        if (!(sixRule && d == 6)) { sixes = 0; advanceTurn(); }
        return out;
    }

    private void advanceTurn() { turn = (turn + 1) % players.size(); }
}
