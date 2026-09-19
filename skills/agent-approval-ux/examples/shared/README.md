# Shared

`DecisionCard.tsx` renders an `ApprovalDecision` and returns an `ApprovalResponse`. Each framework example adapts to and from it.

Styling uses shadcn theme tokens (`bg-card`, `text-muted-foreground`, `border-input`, `ring`, `destructive`) and `lucide-react` icons, so it drops into a shadcn app unchanged. In an app without those tokens, define them in your stylesheet (the demo's `globals.css` shows the full set) or swap the class strings.

`types.ts` mirrors `references/schema.json` and `references/response.schema.json`. The JSON is the source of truth.
