# Implementation Workflow

Claude must implement the project incrementally.

## Phase 1 --- Analysis

Inspect the design and produce the design analysis.

Wait for confirmation before starting the prototype.

## Phase 2 --- First Prototype

Implement only the first representative Dashboard/Home page.

Include:

-   Global layout required by the page.
-   Sidebar/navigation required by the design.
-   Header required by the design.
-   Dashboard content.
-   Realistic mock data.
-   Functional UI interactions visible in the design.

Do not implement all remaining pages.

After implementation:

1.  Run the application.
2.  Verify the page visually.
3.  Verify the application builds.
4.  Stop and wait for review.

## Phase 3 --- Visual Refinement

The first Dashboard/Home page becomes the visual baseline.

If feedback is provided:

-   Fix the visual issues first.
-   Do not redesign.
-   Do not introduce new UI patterns.
-   Compare again with the original reference.
-   Run the application again.
-   Wait for approval.

## Phase 4 --- Approval

Only after explicit approval of the first prototype:

-   Implement the remaining pages.
-   Reuse the approved visual language.
-   Reuse components where appropriate.
-   Keep mock data realistic.
-   Maintain the same spacing, typography, colors, and component
    patterns.

## Phase 5 --- Self Review

After completing a logical group of pages, review the implementation
against the original design.

Check:

-   Visual consistency
-   Spacing
-   Typography
-   Colors
-   Component sizes
-   Missing elements
-   Unnecessary elements
-   Responsive behavior
-   Component reuse
-   TypeScript quality
-   Separation of mock data and UI
-   API readiness

Fix inconsistencies before moving to the next group.

## Important

Do not implement the entire application in one pass.

Do not assume that a successful build means the design is correct.

Visual fidelity is a first-class acceptance criterion.
