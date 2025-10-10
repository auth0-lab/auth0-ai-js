"use client";

import { PromptUserContainer } from "../util/prompt-user-container";

import type { TokenVaultAuthProps } from "./TokenVaultAuthProps";

export function TokenVaultConsentRedirect({
  interrupt: { requiredScopes, connection },
  connectWidget: { icon, title, description, action, containerClassName },
  auth: {
    connectPath = "/auth/connect",
    returnTo = window.location.pathname,
  } = {},
}: TokenVaultAuthProps) {
  return (
    <PromptUserContainer
      title={title}
      description={description}
      icon={icon}
      containerClassName={containerClassName}
      action={{
        label: action?.label ?? "Connect",
        onClick: () => {
          const search = new URLSearchParams({
            returnTo,
            connection,
            scope: requiredScopes.join(),
          });

          const url = new URL(connectPath, window.location.origin);
          url.search = search.toString();

          // Redirect to the authorization page
          window.location.href = url.toString();
        },
      }}
    />
  );
}
