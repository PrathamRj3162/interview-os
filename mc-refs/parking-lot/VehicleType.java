public enum VehicleType {
    BIKE(10), CAR(20), TRUCK(50);

    final int hourlyRate;

    VehicleType(int rate) { this.hourlyRate = rate; }

    static VehicleType parse(String s) {
        try { return valueOf(s); } catch (IllegalArgumentException | NullPointerException e) { throw new IllegalArgumentException("invalid type"); }
    }

    /** Slot 1 trucks, 2–3 bikes, the rest cars. */
    static VehicleType forSlot(int slot) {
        return slot == 1 ? TRUCK : slot <= 3 ? BIKE : CAR;
    }
}
