import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { sendNotification } from "@/lib/notificationService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const NotificationTriggerTest = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const testDirectNotification = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await sendNotification({
        user_id: user.id,
        title: "Test Notification",
        message: "This is a test direct notification",
        type: "system",
      });

      setStatus({
        success: result,
        message: result
          ? "Direct notification sent successfully"
          : "Failed to send direct notification",
      });
    } catch (error) {
      console.error("Error sending test notification:", error);
      setStatus({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const testTriggerNotification = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Insert a test booking to trigger the notification
      const { data, error } = await supabase
        .from("bookings")
        .insert([
          {
            user_id: user.id,
            vehicle_id: "test-vehicle-id", // This should be a valid vehicle ID in your database
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
            status: "pending",
            notes: "Test booking to trigger notification",
          },
        ])
        .select();

      if (error) throw error;

      setStatus({
        success: true,
        message: `Test booking created with ID: ${data[0].id}. Check if notification was triggered.`,
      });
    } catch (error) {
      console.error("Error creating test booking:", error);
      setStatus({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const checkTriggers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("check_notification_triggers");

      if (error) throw error;

      setStatus({
        success: true,
        message: `Trigger status: ${JSON.stringify(data)}`,
      });
    } catch (error) {
      console.error("Error checking triggers:", error);
      setStatus({
        success: false,
        message: `Error checking triggers: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetLocalNotifications = () => {
    if (!user) return;
    localStorage.removeItem(`notifications_${user.id}`);
    setStatus({
      success: true,
      message: "Local notifications cache cleared",
    });
    // Trigger storage event to update components
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <Card className="w-full max-w-3xl mx-auto bg-white">
      <CardHeader>
        <CardTitle>Test Notification System</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <Alert variant={status.success ? "default" : "destructive"}>
            <AlertTitle>{status.success ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={testDirectNotification}
            disabled={loading}
            className="w-full"
          >
            Test Direct Notification
          </Button>

          <Button
            onClick={testTriggerNotification}
            disabled={loading}
            className="w-full"
          >
            Test Trigger Notification
          </Button>

          <Button
            onClick={checkTriggers}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            Check Notification Triggers
          </Button>

          <Button
            onClick={resetLocalNotifications}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            Reset Local Notifications
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationTriggerTest;
