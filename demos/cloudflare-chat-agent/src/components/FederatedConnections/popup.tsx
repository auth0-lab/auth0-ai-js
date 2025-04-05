"use client";

import { useCallback, useEffect, useState } from "react";

import { WaitingMessage } from "./loader";
import { PromptUserContainer } from "./prompt-user-container";
import type { FederatedConnectionAuthProps } from "./FederatedConnectionAuthProps";

export function EnsureAPIAccessPopup({
  connection,
  scopes,
  connectWidget: { icon, title, description, action },
  onFinish,
}: FederatedConnectionAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loginPopup, setLoginPopup] = useState<Window | null>(null);

  //Poll for the login process until the popup is closed
  // or the user is authorized
  useEffect(() => {
    if (!loginPopup) {
      return;
    }
    const interval = setInterval(async () => {
      if (loginPopup && loginPopup.closed) {
        setIsLoading(false);
        setLoginPopup(null);
        clearInterval(interval);
        if (onFinish) {
          onFinish();
        }
      }
    }, 1000);
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [loginPopup, onFinish]);

  //Open the login popup
  const startLoginPopup = useCallback(async () => {
    const userSlug = window.location.pathname.split("/")[2];

    const params = new URLSearchParams({
      connection,
      access_type: "offline",
      prompt: "consent",
      connection_scope: scopes.join(),
      returnTo: `/agents/${userSlug}/chat/${userSlug}/refresh?returnTo=/close`,
    });

    const url = `/login?${params.toString()}`;
    const windowFeatures =
      "width=800,height=650,status=no,toolbar=no,menubar=no";
    const popup = window.open(url, "_blank", windowFeatures);
    if (!popup) {
      console.error("Popup blocked by the browser");
      return;
    } else {
      setLoginPopup(popup);
      setIsLoading(true);
    }
  }, [connection, scopes]);

  if (isLoading) {
    return <WaitingMessage />;
  }

  return (
    <PromptUserContainer
      title={title}
      description={description}
      icon={icon}
      action={{
        label: action?.label ?? "Connect",
        onClick: startLoginPopup,
      }}
    />
  );
}
