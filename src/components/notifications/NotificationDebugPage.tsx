import React from "react";
import Header from "../dashboard/Header";
import NotificationDebugPanel from "../dashboard/NotificationDebugPanel";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";

const NotificationDebugPage = () => {
  const { profile } = useAuth();

  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Debug Notifiche</h1>
            <Button
              onClick={() => (window.location.href = "/notifications/guide")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              Guida al Testing
            </Button>
          </div>

          {profile?.role === "admin" ? (
            <NotificationDebugPanel />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Non hai i permessi per accedere a questa pagina
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDebugPage;
