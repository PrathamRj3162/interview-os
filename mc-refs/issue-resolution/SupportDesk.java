import java.util.*;

public class SupportDesk {
    private record Issue(String id, String type) { }

    private static final class Agent {
        final String id; final Set<String> skills; Issue current; boolean onLeave; final List<String> resolved = new ArrayList<>();
        Agent(String id, Set<String> skills) { this.id = id; this.skills = skills; }
        boolean canTake(Issue i) { return !onLeave && current == null && skills.contains(i.type()); }
    }

    private final Map<String, Agent> agents = new TreeMap<>();
    private final Deque<Issue> waiting = new ArrayDeque<>();
    private final Map<String, Agent> assigned = new HashMap<>();

    public void addAgent(String id, List<String> skills) { agents.put(id, new Agent(id, new HashSet<>(skills))); }

    public List<String> newIssue(String id, String type) { return place(new Issue(id, type), false); }

    /** Assigns to the free agent with the skill and the smallest id, or queues (at the front when re-queued). */
    private List<String> place(Issue issue, boolean front) {
        for (Agent a : agents.values()) if (a.canTake(issue)) return List.of(assign(a, issue));
        if (front) waiting.addFirst(issue); else waiting.addLast(issue);
        return List.of("WAITING " + issue.id());
    }

    private String assign(Agent a, Issue i) {
        a.current = i;
        assigned.put(i.id(), a);
        return "ASSIGNED " + i.id() + " " + a.id;
    }

    public List<String> resolve(String issueId) {
        Agent a = assigned.remove(issueId);
        if (a == null) return List.of("ERROR cannot resolve " + issueId);
        a.resolved.add(issueId);
        a.current = null;
        List<String> out = new ArrayList<>(List.of("RESOLVED " + issueId));
        for (Iterator<Issue> it = waiting.iterator(); it.hasNext(); ) {
            Issue next = it.next();
            if (a.canTake(next)) { it.remove(); out.add(assign(a, next)); break; }
        }
        return out;
    }

    public String history(String agentId) {
        Agent a = agents.get(agentId);
        return a == null || a.resolved.isEmpty() ? "None" : String.join(",", a.resolved);
    }

    public List<String> leave(String agentId) {
        Agent a = agents.get(agentId);
        if (a == null) return List.of("ERROR unknown agent " + agentId);
        a.onLeave = true;
        if (a.current == null) return List.of();
        Issue i = a.current;
        a.current = null;
        assigned.remove(i.id());
        return place(i, true);
    }
}
