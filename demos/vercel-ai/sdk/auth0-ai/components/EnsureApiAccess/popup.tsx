"use client";

import { useCallback, useEffect, useState } from "react";

import { useUser } from "@auth0/nextjs-auth0";

import { WaitingMessage } from "../loader";
import { PromptUserContainer } from "../prompt-user-container";
import { EnsureAPIAccessProps } from "./EnsureAPIAccessProps";

export function EnsureAPIAccessPopup({
  connection,
  scopes,
  connectWidget: { icon, title, description, action },
  addToolResult,
}: EnsureAPIAccessProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loginPopup, setLoginPopup] = useState<Window | null>(null);
  const { user } = useUser();

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
        if (addToolResult) {
          addToolResult({ success: true });
        }
      }
    }, 1000);
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [loginPopup, addToolResult]);

  //Open the login popup
  const startLoginPopup = useCallback(async () => {
    const params = new URLSearchParams({
      connection,
      access_type: "offline",
      prompt: "consent",
      connection_scope: scopes.join(),
      returnTo: "/close",
    });
    const url = `/auth/login?${params.toString()}`;
    console.log(`URL for popup: ${url}`);
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
