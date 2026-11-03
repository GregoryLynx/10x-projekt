import type { ReactNode } from "react";
import React, { useState } from "react";
import { AtSign, Check, ClipboardList, Lock, Plus, Trash2, User, UserPlus } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { PasswordToggle } from "@/components/auth/PasswordToggle";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import type { ChildChore } from "@/components/family/ChildToday";
import { cn } from "@/lib/utils";
import { isDone } from "@/types";

const LOGIN_PATTERN = /^[a-z0-9]{3,32}$/;
const MIN_PASSWORD_LENGTH = 6;

export interface ParentChild {
  id: string;
  displayName: string;
  email: string | null;
  chores: ChildChore[];
}

export type ParentTodayView = "unavailable" | "add-child" | "child" | "child-unavailable";

interface Props {
  serverError?: string | null;
  view: ParentTodayView;
  familyChildren: ParentChild[];
  choreAdded: boolean;
  loadFailed: boolean;
  choreConfirmed: boolean;
  choreRemoved: boolean;
}

interface AddChildErrors {
  displayName?: string;
  login?: string;
  password?: string;
}

function choreIsDone(chore: ChildChore): boolean {
  return isDone({
    child_checked_at: chore.childCheckedAt,
    parent_confirmed_at: chore.parentConfirmedAt,
  });
}

function AddChildForm({ serverError }: { serverError?: string | null }) {
  const [displayName, setDisplayName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<AddChildErrors>({});

  function validate() {
    const next: AddChildErrors = {};
    if (!displayName.trim()) {
      next.displayName = "Name is required";
    }
    const loginValue = login.trim().toLowerCase();
    if (!loginValue) {
      next.login = "Login is required";
    } else if (!LOGIN_PATTERN.test(loginValue)) {
      next.login = "Login must be 3-32 letters or digits";
    }
    if (!password) {
      next.password = "Password is required";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function clearError(field: keyof AddChildErrors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    if (!validate()) {
      e.preventDefault();
    }
  }

  return (
    <form method="POST" action="/api/family/children" className="space-y-4" onSubmit={handleSubmit} noValidate>
      <FormField
        id="display_name"
        label="Name"
        value={displayName}
        onChange={(v) => {
          setDisplayName(v);
          clearError("displayName");
        }}
        placeholder="Zosia"
        error={errors.displayName}
        icon={<User className="size-4" />}
      />

      <FormField
        id="login"
        label="Login"
        value={login}
        onChange={(v) => {
          setLogin(v);
          clearError("login");
        }}
        placeholder="zosia"
        error={errors.login}
        icon={<AtSign className="size-4" />}
      />

      <FormField
        id="password"
        label="Password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(v) => {
          setPassword(v);
          clearError("password");
        }}
        placeholder="Min. 6 characters"
        error={errors.password}
        icon={<Lock className="size-4" />}
        endContent={
          <PasswordToggle
            visible={showPassword}
            onToggle={() => {
              setShowPassword(!showPassword);
            }}
          />
        }
      />

      <ServerError message={serverError} />

      <SubmitButton pendingText="Adding child..." icon={<UserPlus className="size-4" />}>
        Add child
      </SubmitButton>
    </form>
  );
}

function ConfirmForm({ chore }: { chore: ChildChore }) {
  return (
    <form method="POST" action="/api/family/chore-confirm">
      <input type="hidden" name="chore_id" value={chore.id} />
      <SubmitButton pendingText="Confirming..." icon={<Check className={cn("size-4")} />}>
        Confirm
      </SubmitButton>
    </form>
  );
}

function RemoveForm({ chore }: { chore: ChildChore }) {
  return (
    <form method="POST" action="/api/family/chore-remove">
      <input type="hidden" name="chore_id" value={chore.id} />
      <SubmitButton pendingText="Removing..." icon={<Trash2 className={cn("size-4")} />}>
        Remove
      </SubmitButton>
    </form>
  );
}

function ChoreGroup({
  heading,
  chores,
  showConfirm,
  showRemove,
}: {
  heading: string;
  chores: ChildChore[];
  showConfirm?: boolean;
  showRemove?: boolean;
}) {
  return (
    <section className={cn("space-y-3")}>
      <h2 className={cn("text-center text-sm font-semibold text-blue-100")}>{heading}</h2>
      <ul className={cn("space-y-4")}>
        {chores.map((chore) => (
          <li key={chore.id} className={cn("space-y-2")}>
            <p className={cn("text-center text-sm text-white")}>{chore.title}</p>
            {showConfirm ? <ConfirmForm chore={chore} /> : null}
            {showRemove ? <RemoveForm chore={chore} /> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChildToday({ child, loadFailed }: { child: ParentChild; loadFailed: boolean }) {
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | undefined>();

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    if (!title.trim()) {
      setTitleError("Title is required");
      e.preventDefault();
      return;
    }
    setTitleError(undefined);
  }

  const chores = child.chores;
  const todo = chores.filter((chore) => chore.childCheckedAt === null);
  const waiting = chores.filter((chore) => chore.childCheckedAt !== null && !choreIsDone(chore));
  const done = chores.filter((chore) => choreIsDone(chore));

  let listBody: ReactNode;
  if (loadFailed) {
    listBody = <p className={cn("text-center text-sm text-blue-100/80")}>{"Could not load today's list."}</p>;
  } else if (chores.length === 0) {
    listBody = <p className={cn("text-center text-sm text-blue-100/80")}>{"Nothing on today's list."}</p>;
  } else {
    listBody = (
      <div className={cn("space-y-4")}>
        {todo.length > 0 ? <ChoreGroup heading="To do" chores={todo} showRemove /> : null}
        {waiting.length > 0 ? (
          <ChoreGroup heading="Waiting for confirmation" chores={waiting} showConfirm showRemove />
        ) : null}
        {done.length > 0 ? <ChoreGroup heading="Done" chores={done} /> : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4")}>
      <div className={cn("space-y-1 text-center")}>
        <p className={cn("text-lg font-semibold text-white")}>{child.displayName}</p>
        <p className={cn("text-sm", child.email ? "text-blue-100/80" : "text-blue-100/60")}>
          {child.email ?? "The login email could not be loaded."}
        </p>
      </div>
      {listBody}
      <form method="POST" action="/api/family/chores" className={cn("space-y-4")} onSubmit={handleSubmit} noValidate>
        <input type="hidden" name="child_profile_id" value={child.id} />
        <FormField
          id={`title-${child.id}`}
          name="title"
          label="Title"
          value={title}
          onChange={(v) => {
            setTitle(v);
            if (titleError) setTitleError(undefined);
          }}
          placeholder="Brush teeth"
          error={titleError}
          icon={<ClipboardList className={cn("size-4")} />}
        />
        <SubmitButton pendingText="Adding chore..." icon={<Plus className={cn("size-4")} />}>
          Add chore
        </SubmitButton>
      </form>
    </div>
  );
}

export default function ParentToday({
  serverError,
  view,
  familyChildren,
  choreAdded,
  loadFailed,
  choreConfirmed,
  choreRemoved,
}: Props) {
  if (view === "add-child") {
    return <AddChildForm serverError={serverError} />;
  }

  const listed = familyChildren.slice(0, 2);
  if (view === "child" && listed.length > 0) {
    return (
      <div className={cn("space-y-4")}>
        {choreAdded ? <p className={cn("text-center text-sm text-blue-100")}>Chore added.</p> : null}
        {choreConfirmed ? <p className={cn("text-center text-sm text-blue-100")}>Chore confirmed.</p> : null}
        {choreRemoved ? <p className={cn("text-center text-sm text-blue-100")}>Chore removed.</p> : null}
        <ServerError message={serverError} />
        <div className={cn("space-y-8")}>
          {listed.map((child) => (
            <ChildToday key={child.id} child={child} loadFailed={loadFailed} />
          ))}
          {listed.length < 2 ? <AddChildForm /> : null}
        </div>
      </div>
    );
  }

  if (view === "child" || view === "child-unavailable") {
    return (
      <div className={cn("space-y-4")}>
        <p className={cn("text-center text-sm text-blue-100/80")}>Could not load your child.</p>
        <ServerError message={serverError} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4")}>
      <p className={cn("text-center text-sm text-blue-100/80")}>This screen is for a parent.</p>
      <ServerError message={serverError} />
    </div>
  );
}
