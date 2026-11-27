import java.util.*;

public class Main {
    public static void main(String[] args) {
        RoomBooker booker = new RoomBooker();
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String[] p = in.nextLine().trim().split("\\s+");
            if (p[0].isEmpty()) continue;
            try {
                switch (p[0]) {
                    case "ROOM" -> booker.addRoom(p[1], Integer.parseInt(p[2]));
                    case "BOOK" -> System.out.println(booker.book(p[1], Integer.parseInt(p[2]), Integer.parseInt(p[3]), Integer.parseInt(p[4]), 1));
                    case "BOOK_DAILY" -> System.out.println(booker.book(p[1], Integer.parseInt(p[2]), Integer.parseInt(p[3]), Integer.parseInt(p[4]), Integer.parseInt(p[5])));
                    case "CANCEL" -> booker.cancel(p[1]);
                    case "SCHEDULE" -> booker.schedule(p[1]).forEach(System.out::println);
                    default -> { }
                }
            } catch (IllegalArgumentException e) {
                System.out.println("ERROR " + e.getMessage());
            }
        }
    }
}
