# Review Prompts

These prompts can be sent to Claude during implementation.

## Before Coding

``` text
Before writing code, analyze the attached design according to 01-DESIGN-ANALYSIS.md.

Do not implement the full application yet.

Show me your analysis and wait for confirmation.
```

## First Prototype

``` text
Now implement only the first Dashboard/Home page.

Follow the reference design as closely as possible.

Use the required stack and realistic mock data.

Do not implement the remaining pages.

Run the application and stop after the first prototype so I can review it.
```

## Visual Refinement

``` text
I reviewed the prototype.

Do not continue with the remaining pages yet.

Refine the current implementation to match the reference design more accurately.

Focus on the specific feedback I provide.

Do not redesign the page or introduce new UI patterns.

After the changes, run the application again for review.
```

## Approval

``` text
The Dashboard/Home page is approved.

Treat it as the visual baseline for the entire application.

Continue implementing the remaining pages from the reference.

Reuse the same visual language, component patterns, spacing, typography, colors, and interaction patterns.

Do not introduce a different Vuetify style.
```

## Self Review

``` text
Now act as a senior frontend architect and UI/UX reviewer.

Compare the current implementation against the original reference.

Check:

1. Visual inconsistencies
2. Incorrect spacing
3. Incorrect typography
4. Incorrect colors
5. Incorrect component sizes
6. Missing UI elements
7. Unnecessary UI elements
8. Responsive issues
9. Component boundaries
10. Code duplication
11. Mock data mixed with presentation logic
12. Anything that could make future API integration difficult

Do not redesign the application.

Fix only issues that violate the reference design or the agreed architecture.

Verify that the application still builds successfully.
```
