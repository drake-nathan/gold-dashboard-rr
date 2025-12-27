# UI Prompt

## Tech Stack

- Shadcn - many components are already available in `app/components/ui`, you can add others as needed with bunx --bun shadcn@latest add <component-name>
  - You can find the list of available components at https://ui.shadcn.com/components
- Tailwind v4
- React v19 w/React Compiler
- TypeScript
- React Router v7
- Convex

## UI Specs

- The app is a dashboard for viewing Costco gold prices vs Collect Pure bids
- The spread calculation should be displayed in the UI with these parameters:
  - Assume a 2% cash back from the Costco Executive membership, the user can toggle this on/off, default on
  - There should be a user specified cashback % for the credit card used, default 1%.
    - The user can calculate this based on the credit earn \* the value of the credit card points
    - Example: Freedom Unlimited Card earns 1.5% cashback, but the points are worth $0.021 each, so the cashback is 1.5% \* $0.021 = $0.0315
    - The user can specify both inputs, and we can provide a preset list of credit cards to select from, the user can edit the values and add their own cards
  - Finally, display the spread as the final value, positive or negative
- Instead of a table, let's use a card layout
  - The cards should be sortable by spread and price, and filterable by gold/silver
  - The cards should have a thumbnail of the item, all numbers/info, and links to both costco and collect pure
- Include placeholder for signup/login buttons from Clerk
- Include placeholder for dark mode toggle
- The app should have a modern, clean, and professional look
- The app should be responsive and work on all devices
- Leave tokens as is, i will tweak theme later

## Guidelines

- Keep components small, simple, and reusable
- Abstract complex logic into testable hooks or utility functions
- Avoid useEffect except to valid use cases (syncing with external systems, etc)
- Focus on the UI for now, you can fetch existing data available in Convex, but lean on fake/mock data where needed, and make a list of things to come back to
