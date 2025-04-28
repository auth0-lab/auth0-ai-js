"use client";

import { PromptUserContainer } from "../util/prompt-user-container";
import type { FederatedConnectionAuthProps } from "./FederatedConnectionAuthProps";

export function EnsureAPIAccessRedirect({
  interrupt: { requiredScopes, connection },
  connectWidget: { icon, title, description, action, containerClassName },
}: FederatedConnectionAuthProps) {
  return (
    <PromptUserContainer
      title={title}
      description={description}
      icon={icon}
      containerClassName={containerClassName}
      action={{
        label: action?.label ?? "Connect",
        onClick: () => {
          const params = new URLSearchParams({
            connection,
            access_type: "offline",
            connection_scope: requiredScopes.join(),
            returnTo: window.location.pathname,
          });
          const url = `/api/auth/login?${params.toString()}`;
          window.location.href = url;
        },
      }}
    />
  );
}
