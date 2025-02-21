"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getGoogleConnectionName, setAsyncInterval } from "@/lib/utils";
import { PromptUserContainer } from "@/llm/components/prompt-user-container";

import { getThirdPartyContext } from "../../auth0/3rd-party-apis";
import Loader from "../loader";
import { EnsureAPIAccessProps } from "./EnsureAPIAccessProps";

export function EnsureAPIAccessRedirect({
  children,
  provider,
  connectWidget: { title, description, icon, action },
  onUserAuthorized,
  readOnly,
}: EnsureAPIAccessProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginRequired, setLoginRequired] = useState(false);

  // check if the session has the current scope
  const getHasRequiredScopes = useCallback(async () => {
    const ctx = await getThirdPartyContext({
      providers: [
        {
          name: provider.name,
          api: provider.api,
          requiredScopes: provider.requiredScopes,
        },
      ],
    });
    return ctx.google.containsRequiredScopes;
  }, [provider]);

  //Trigger the component callback to load state when the user is authorized
  useEffect(() => {
    if (isLoginRequired || !onUserAuthorized) {
      return;
    }
    onUserAuthorized();
  }, [isLoginRequired, onUserAuthorized]);

  //Load the initial state
  useEffect(() => {
    (async () => {
      const hasRequiredScopes = await getHasRequiredScopes();
      setLoginRequired(!hasRequiredScopes);
      setIsLoading(false);
    })();
  }, [getHasRequiredScopes]);

  if (isLoading) {
    return <Loader />;
  }

  if (isLoginRequired) {
    return (
      <PromptUserContainer
        title={title}
        description={description}
        icon={icon}
        action={{
          label: action?.label ?? "Connect",
          onClick: () => {
            const params = new URLSearchParams({
              "3rdPartyApi": provider.api,
              linkWith: getGoogleConnectionName(),
              returnTo: window.location.pathname,
            });
            const url = `/api/auth/login?${params.toString()}`;
            window.location.href = url;
          },
        }}
        readOnly={readOnly}
      />
    );
  }

  return <>{children}</>;
}
