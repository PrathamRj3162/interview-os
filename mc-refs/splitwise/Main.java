import java.util.*;

public class Main {
    public static void main(String[] args) {
        ExpenseService svc = new ExpenseService();
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            try {
                switch (p[0]) {
                    case "USER" -> svc.addUser(p[1]);
                    case "EXPENSE" -> svc.addExpense(p);
                    case "SHOW" -> print(p.length > 1 ? svc.balancesFor(p[1]) : svc.allBalances());
                    default -> { }
                }
            } catch (IllegalArgumentException e) {
                System.out.println("ERROR " + e.getMessage());
            }
        }
    }

    private static void print(List<String> lines) {
        if (lines.isEmpty()) System.out.println("No balances");
        else lines.forEach(System.out::println);
    }
}
