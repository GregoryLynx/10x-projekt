import React, { useState } from "react";
import { AtSign, ClipboardList, Lock, Plus, User, UserPlus } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { PasswordToggle } from "@/components/auth/PasswordToggle";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { cn } from "@/lib/utils";

const LOGIN_PATTERN = /^[a-z0-9]{3,32}$/;
const MIN_PASSWORD_LENGTH = 6;

export interface ParentChild {
  id: string;
  displayName: string;
  email: string | null;
}

export type ParentTodayView = "unavailable" | "add-child" | "child" | "child-unavailable";

interface Props {
  serverError?: string | null;
  view: ParentTodayView;
  child: ParentChild | null;
  choreAdded: boolean;
}

interface AddChildErrors {
  displayName?: string;
  login?: string;
  password?: string;
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

function ChildToday({
  child,
  serverError,
  choreAdded,
}: {
  child: ParentChild;
  serverError?: string | null;
  choreAdded: boolean;
}) {
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

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <p className="text-lg font-semibold text-white">{child.displayName}</p>
        <p className={cn("text-sm", child.email ? "text-blue-100/80" : "text-blue-100/60")}>
          {child.email ?? "The login email could not be loaded."}
        </p>
      </div>
      <p className="text-center text-sm text-blue-100/50">A second child arrives in the next slice.</p>
      {choreAdded ? <p className="text-center text-sm text-blue-100">Chore added.</p> : null}
      <form method="POST" action="/api/family/chores" className="space-y-4" onSubmit={handleSubmit} noValidate>
        <input type="hidden" name="child_profile_id" value={child.id} />
        <FormField
          id="title"
          label="Title"
          value={title}
          onChange={(v) => {
            setTitle(v);
            if (titleError) setTitleError(undefined);
          }}
          placeholder="Brush teeth"
          error={titleError}
          icon={<ClipboardList className="size-4" />}
        />
        <ServerError message={serverError} />
        <SubmitButton pendingText="Adding chore..." icon={<Plus className="size-4" />}>
          Add chore
        </SubmitButton>
      </form>
    </div>
  );
}

export default function ParentToday({ serverError, view, child, choreAdded }: Props) {
  if (view === "add-child") {
    return <AddChildForm serverError={serverError} />;
  }

  if (view === "child" && child) {
    return <ChildToday child={child} serverError={serverError} choreAdded={choreAdded} />;
  }

  if (view === "child" || view === "child-unavailable") {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-blue-100/80">Could not load your child.</p>
        <ServerError message={serverError} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-blue-100/80">This screen is for a parent.</p>
      <ServerError message={serverError} />
    </div>
  );
}
