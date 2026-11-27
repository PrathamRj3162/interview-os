import java.util.List;

/** Turns an amount (paise) and the split arguments into one share per user. */
public interface SplitStrategy {
    long[] shares(long amountPaise, int users, List<String> args);
}
