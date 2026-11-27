public record Point(double x, double y) {
    double distanceTo(Point o) { return Math.hypot(x - o.x, y - o.y); }
}
