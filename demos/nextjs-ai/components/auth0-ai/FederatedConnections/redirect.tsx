"use client";

import { PromptUserContainer } from "../util/prompt-user-container";
import { FederatedConnectionAuthProps } from "./FederatedConnectionAuthProps";

export function EnsureAPIAccessRedirect({
  connection,
  scopes,
  connectWidget: { icon, title, description, action },
}: FederatedConnectionAuthProps) {
  return (
    <PromptUserContainer
      title={title}
      description={description}
      icon={icon}
      action={{
        label: action?.label ?? "Connect",
        onClick: () => {
          const params = new URLSearchParams({
            connection,
            access_type: "offline",
            connection_scope: scopes.join(),
            returnTo: window.location.pathname,
          });
          const url = `/api/auth/login?${params.toString()}`;
          window.location.href = url;
        },
      }}
    />
  );
}
