/**
 * DSA pattern guides, written for Interview OS. Each guide links to bank problems through `topics`
 * (the same tags the problem bank uses), so "practise this pattern" always points at real problems.
 */
export type Pattern = {
  slug: string;
  title: string;
  topics: string[];
  summary: string;
  when: string[];
  template: string;
  complexity: string;
  pitfalls: string[];
};

export const PATTERNS: Pattern[] = [
  {
    slug: "hashing", title: "Hash maps & sets", topics: ["Hash map", "Hash set", "Counting"],
    summary: "Trade memory for time: remember what you've seen so each lookup is O(1) instead of a scan.",
    when: ["\"Have I seen this before?\"", "Find a pair/complement (two-sum style)", "Count frequencies or group by a key", "De-duplicate"],
    template: "seen = {}\nfor i, x in enumerate(items):\n    need = target - x          # or a key derived from x\n    if need in seen: return (seen[need], i)\n    seen[x] = i",
    complexity: "O(n) time, O(n) space.",
    pitfalls: ["Checking the map after inserting the current element (pairs it with itself)", "Using a mutable/unsorted key for grouping — sort or count characters to build a canonical key"],
  },
  {
    slug: "two-pointers", title: "Two pointers", topics: ["Two pointers", "Fast & slow pointers"],
    summary: "Move two indices toward each other (sorted input) or at different speeds (cycles, middles) to avoid nested loops.",
    when: ["Sorted array and a pair/triple condition", "Palindromes", "In-place partitioning or removal", "Middle of a list, cycle detection"],
    template: "l, r = 0, len(a) - 1\nwhile l < r:\n    s = a[l] + a[r]\n    if s == target: return (l, r)\n    if s < target: l += 1\n    else: r -= 1",
    complexity: "O(n) after an O(n log n) sort if needed; O(1) extra space.",
    pitfalls: ["Forgetting to skip duplicates (3Sum)", "Using it on unsorted data where moving a pointer isn't monotonic"],
  },
  {
    slug: "sliding-window", title: "Sliding window", topics: ["Sliding window", "Deque"],
    summary: "Keep a window [l, r] that satisfies a condition; grow r, shrink l when the condition breaks.",
    when: ["Longest/shortest contiguous subarray or substring with a property", "\"At most k\" distinct/replacements", "Max of every window (monotonic deque)"],
    template: "l = 0\nfor r, x in enumerate(s):\n    add(x)\n    while not valid():\n        remove(s[l]); l += 1\n    best = max(best, r - l + 1)",
    complexity: "O(n): each element enters and leaves the window once.",
    pitfalls: ["Shrinking with `if` instead of `while`", "Updating the answer before the window is valid again"],
  },
  {
    slug: "stack", title: "Stacks & monotonic stacks", topics: ["Stack", "Monotonic stack"],
    summary: "A stack remembers unfinished work; a monotonic stack finds the next greater/smaller element in one pass.",
    when: ["Matching brackets / nested structure", "Next greater or smaller element", "Spans and histograms", "Evaluating expressions"],
    template: "st = []                     # indices, values decreasing\nfor i, x in enumerate(a):\n    while st and a[st[-1]] < x:\n        j = st.pop(); ans[j] = i - j\n    st.append(i)",
    complexity: "O(n): every index is pushed and popped at most once.",
    pitfalls: ["Storing values when you need indices (distances)", "Forgetting to flush the stack at the end (histogram)"],
  },
  {
    slug: "binary-search", title: "Binary search", topics: ["Binary search", "Binary search on answer"],
    summary: "Halve the search space using a monotonic condition — on an array or on the answer itself.",
    when: ["Sorted or rotated sorted data", "\"Minimum x such that condition(x) holds\"", "Search in a sorted matrix"],
    template: "lo, hi = low, high\nwhile lo < hi:\n    mid = (lo + hi) // 2\n    if ok(mid): hi = mid\n    else: lo = mid + 1\nreturn lo",
    complexity: "O(log n) steps × the cost of ok().",
    pitfalls: ["Off-by-one loops (`lo <= hi` vs `lo < hi`) — pick one template and stick to it", "Overflow in `(lo + hi)` in C++/Java: use `lo + (hi - lo) / 2`"],
  },
  {
    slug: "intervals", title: "Intervals & sweep line", topics: ["Intervals", "Sweep line"],
    summary: "Sort by start (or end), then merge, count overlaps, or greedily keep the earliest-ending interval.",
    when: ["Merge or insert ranges", "Minimum rooms/platforms", "Remove fewest intervals to avoid overlap"],
    template: "intervals.sort()\nout = [intervals[0]]\nfor s, e in intervals[1:]:\n    if s <= out[-1][1]: out[-1][1] = max(out[-1][1], e)\n    else: out.append([s, e])",
    complexity: "O(n log n) for the sort, then O(n).",
    pitfalls: ["Whether touching endpoints overlap — ask the interviewer", "Sorting by start when the greedy needs end time"],
  },
  {
    slug: "linked-lists", title: "Linked lists", topics: ["Linked list"],
    summary: "Pointer surgery: a dummy head removes edge cases; draw the next pointers before you change them.",
    when: ["Reverse all or part of a list", "Merge sorted lists", "Remove the k-th node from the end", "Find the middle or detect a cycle"],
    template: "dummy = ListNode(0, head)\nprev, cur = None, head\nwhile cur:\n    nxt = cur.next\n    cur.next = prev\n    prev, cur = cur, nxt\nreturn prev",
    complexity: "Usually O(n) time, O(1) extra space.",
    pitfalls: ["Losing the rest of the list by overwriting `next` too early", "Not handling the empty list or a single node"],
  },
  {
    slug: "trees", title: "Trees: DFS & BFS", topics: ["Tree", "BST", "In-order", "DFS", "BFS"],
    summary: "Most tree problems are \"answer = combine(left answer, right answer)\" — post-order DFS — or level-by-level BFS.",
    when: ["Depth, diameter, balance, path sums", "Level order / right side view", "BST properties (in-order is sorted)", "Build a tree from traversals"],
    template: "def dfs(node):\n    if not node: return base\n    l, r = dfs(node.left), dfs(node.right)\n    update_global(node, l, r)\n    return combine(node, l, r)",
    complexity: "O(n) time, O(h) stack (h = height; up to n when skewed).",
    pitfalls: ["Validating a BST by checking only direct children", "Recursion depth on skewed trees — know the iterative version"],
  },
  {
    slug: "graphs", title: "Graphs: BFS, DFS, topological sort", topics: ["Graph", "BFS/DFS", "Topological sort", "Multi-source BFS", "Union-find", "Dijkstra"],
    summary: "Model the problem as nodes and edges, then pick the traversal: BFS for shortest unweighted paths, DFS for reachability, Kahn's algorithm for ordering, Dijkstra for weights.",
    when: ["Grids (islands, rotting oranges)", "Dependencies / course schedules", "Shortest transformation sequences", "Connected components"],
    template: "from collections import deque\nq = deque(sources); seen = set(sources)\nwhile q:\n    u = q.popleft()\n    for v in neighbours(u):\n        if v not in seen: seen.add(v); q.append(v)",
    complexity: "O(V + E) for BFS/DFS; O(E log V) for Dijkstra.",
    pitfalls: ["Marking visited when popping instead of when pushing (duplicates in the queue)", "Forgetting disconnected components"],
  },
  {
    slug: "heaps", title: "Heaps & top-k", topics: ["Heap", "Quickselect", "Bucket sort"],
    summary: "Keep the k best items in a heap of size k, or repeatedly take the smallest next item (k-way merge, scheduling).",
    when: ["Top-k / k-th largest", "Merge k sorted streams", "Repeatedly pick the cheapest next option"],
    template: "import heapq\nh = []\nfor x in items:\n    heapq.heappush(h, x)\n    if len(h) > k: heapq.heappop(h)\nreturn h[0]   # k-th largest",
    complexity: "O(n log k) time, O(k) space.",
    pitfalls: ["Python's heapq is a min-heap — negate for max", "Sorting everything (O(n log n)) when k is small"],
  },
  {
    slug: "dynamic-programming", title: "Dynamic programming", topics: ["Dynamic programming", "Knapsack", "Combinatorics"],
    summary: "Define a state, a recurrence and base cases; then memoise top-down or fill a table bottom-up.",
    when: ["\"Number of ways\", \"minimum cost\", \"is it possible\"", "Choices at each step that overlap with later choices", "Two strings compared position by position"],
    template: "dp = [base] + [INF] * n\nfor i in range(1, n + 1):\n    for choice in choices(i):\n        dp[i] = min(dp[i], dp[i - cost(choice)] + gain(choice))\nreturn dp[n]",
    complexity: "States × transitions; often O(n²) or O(n·m), reducible in space.",
    pitfalls: ["Starting to code before writing the state in one sentence", "Wrong iteration order for 0/1 vs unbounded knapsack"],
  },
  {
    slug: "backtracking", title: "Backtracking", topics: ["Backtracking", "Bitmask"],
    summary: "Build candidates step by step, undo each choice after exploring it, and prune dead branches early.",
    when: ["All subsets, permutations, combinations", "Constraint puzzles", "\"Generate every …\""],
    template: "def go(i, path):\n    if done(i): out.append(path[:]); return\n    for c in choices(i):\n        path.append(c)\n        go(next(i, c), path)\n        path.pop()",
    complexity: "Exponential (e.g. O(2ⁿ) or O(n!)) — say so, and explain the pruning.",
    pitfalls: ["Appending `path` instead of a copy", "Duplicate results when the input has duplicates (sort and skip)"],
  },
  {
    slug: "greedy", title: "Greedy", topics: ["Greedy"],
    summary: "Make the locally best choice and prove (or argue) that it never hurts — exchange arguments are your friend.",
    when: ["Scheduling and interval selection", "Reachability (jump game)", "Single pass with a running best (stock prices)"],
    template: "best = float('-inf'); cur = 0\nfor x in a:\n    cur = max(x, cur + x)   # extend or restart\n    best = max(best, cur)",
    complexity: "Usually O(n) or O(n log n) with a sort.",
    pitfalls: ["Using greedy where it fails (coin change with arbitrary coins) — test a counter-example", "Not explaining why the choice is safe"],
  },
];

export const PATTERN_BY_SLUG: Record<string, Pattern> = Object.fromEntries(PATTERNS.map((p) => [p.slug, p]));
