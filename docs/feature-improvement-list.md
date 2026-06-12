# Test-Lah Feature Improvement List

QA-focused features to boost productivity in testing apps.

---

## High Impact — Quick Wins

### 1. Test Case Cloning
Duplicate a test case with one click, then modify the copy. 80% of test cases are variations of each other.

### 2. Keyboard Shortcuts
- `N` — New test case
- `↑/↓` — Navigate rows
- `P` / `F` / `S` — Set status (Pass / Fail / Skip)
- `Enter` — Edit selected cell
- `Esc` — Cancel edit

Huge speed boost for power users.

### 3. Test Data Generator
Built-in tool to generate fake data (emails, phone numbers, addresses, UUIDs, dates) and insert directly into steps. Eliminates switching to external tools.

### 4. Bulk Clone
Select multiple test cases → clone them all to another node. Useful when testing similar flows (e.g., same validation on 5 different forms).

---

## Medium Impact

### 5. Test Execution Sessions
A "Run" mode where you go through test cases one by one, mark pass/fail, add execution notes, attach screenshots per run. Current status is static — no history of *when* or *who* tested.

### 6. Bug Report Generator
When a test fails, auto-generate a bug report (title, steps to reproduce, expected vs actual, environment) from the test case data. One click to copy or export.

### 7. Test Coverage Heatmap
Visual overlay on the mindmap showing which nodes have low coverage (few test cases) or high failure rate.

### 8. Reusable Step Blocks
Define common step sequences (e.g., "Login flow", "Navigate to settings") and insert them as blocks into test cases instead of rewriting.

---

## Nice to Have

### 9. Test Case Linking
Mark dependencies ("Run TC-003 first"), useful for sequential workflows.

### 10. Environment Tags
Tag test runs with environment (staging, prod, dev) and filter results by env.
