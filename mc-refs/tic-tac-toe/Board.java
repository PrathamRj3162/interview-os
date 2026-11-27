import java.util.*;

public class Board {
    enum Result { OK, INVALID, WIN, DRAW }

    private final int n, k;
    private final char[][] cells;
    private char current = 'X';
    private int filled = 0;
    private boolean over = false;

    public Board(int n, int k) {
        if (n < 1 || k < 1 || k > n) throw new IllegalArgumentException("invalid size");
        this.n = n;
        this.k = k;
        cells = new char[n][n];
        for (char[] row : cells) Arrays.fill(row, '-');
    }

    public char current() { return current; }
    public boolean isOver() { return over; }

    public Result move(int row, int col) {
        int r = row - 1, c = col - 1;
        if (r < 0 || c < 0 || r >= n || c >= n || cells[r][c] != '-') return Result.INVALID;
        cells[r][c] = current;
        filled++;
        if (wins(r, c)) { over = true; return Result.WIN; }
        if (filled == n * n) { over = true; return Result.DRAW; }
        current = current == 'X' ? 'O' : 'X';
        return Result.OK;
    }

    /** k in a row through the last move, in any of the four directions. */
    private boolean wins(int r, int c) {
        int[][] dirs = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};
        for (int[] d : dirs) {
            int count = 1 + run(r, c, d[0], d[1]) + run(r, c, -d[0], -d[1]);
            if (count >= k) return true;
        }
        return false;
    }

    private int run(int r, int c, int dr, int dc) {
        int count = 0;
        for (int i = r + dr, j = c + dc; i >= 0 && j >= 0 && i < n && j < n && cells[i][j] == cells[r][c]; i += dr, j += dc) count++;
        return count;
    }

    public List<String> rows() {
        List<String> out = new ArrayList<>();
        for (char[] row : cells) out.add(new String(row));
        return out;
    }
}
