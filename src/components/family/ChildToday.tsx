import type { ReactNode } from "react";
import { Check, Undo2 } from "lucide-react";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { cn } from "@/lib/utils";

export interface ChildChore {
  id: string;
  title: string;
  childCheckedAt: string | null;
  parentConfirmedAt: string | null;
}

interface Props {
  serverError?: string | null;
  loadFailed: boolean;
  chores: ChildChore[];
  choreChecked: boolean;
  choreUndone: boolean;
}

type CheckIntent = "check" | "undo";

function CheckForm({ chore, intent }: { chore: ChildChore; intent: CheckIntent }) {
  const undoing = intent === "undo";

  return (
    <form method="POST" action="/api/family/chore-check">
      <input type="hidden" name="chore_id" value={chore.id} />
      <input type="hidden" name="intent" value={intent} />
      <SubmitButton
        pendingText={undoing ? "Undoing..." : "Checking off..."}
        icon={undoing ? <Undo2 className={cn("size-4")} /> : <Check className={cn("size-4")} />}
      >
        {undoing ? "Undo" : "Check off"}
      </SubmitButton>
    </form>
  );
}

function ChoreGroup({ heading, chores, intent }: { heading: string; chores: ChildChore[]; intent: CheckIntent }) {
  return (
    <section className={cn("space-y-3")}>
      <h2 className={cn("text-center text-sm font-semibold text-blue-100")}>{heading}</h2>
      <ul className={cn("space-y-4")}>
        {chores.map((chore) => {
          const locked = intent === "undo" && chore.parentConfirmedAt !== null;
          return (
            <li key={chore.id} className={cn("space-y-2")}>
              <p className={cn("text-center text-sm text-white")}>{chore.title}</p>
              {locked ? null : <CheckForm chore={chore} intent={intent} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function ChildToday({ serverError, loadFailed, chores, choreChecked, choreUndone }: Props) {
  const todo = chores.filter((chore) => chore.childCheckedAt === null);
  const checkedOff = chores.filter((chore) => chore.childCheckedAt !== null);

  let body: ReactNode;
  if (loadFailed) {
    body = <p className={cn("text-center text-sm text-blue-100/80")}>Could not load today's list.</p>;
  } else if (chores.length === 0) {
    body = <p className={cn("text-center text-sm text-blue-100/80")}>Nothing to do today.</p>;
  } else {
    body = (
      <div className={cn("space-y-4")}>
        {todo.length > 0 ? <ChoreGroup heading="To do" chores={todo} intent="check" /> : null}
        {checkedOff.length > 0 ? <ChoreGroup heading="Checked off" chores={checkedOff} intent="undo" /> : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4")}>
      {choreChecked ? <p className={cn("text-center text-sm text-blue-100")}>Chore checked off.</p> : null}
      {choreUndone ? <p className={cn("text-center text-sm text-blue-100")}>Chore undone.</p> : null}
      {body}
      <ServerError message={serverError} />
    </div>
  );
}
