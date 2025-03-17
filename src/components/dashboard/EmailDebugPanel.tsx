import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import { supabase } from "@/lib/supabase";
import { sendEmailViaEdgeFunction } from "@/lib/supabaseEdgeFunctions";

const EmailDebugPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "Test Email da FleetFlow",
    body: "<p>Questo è un test di invio email dal sistema FleetFlow.</p>",
    from: "noreply@fleetflow.com",
  });
  const [logs, setLogs] = useState<any[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setEmailData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching email logs:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i log delle email",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.to || !emailData.subject || !emailData.body) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Registra il tentativo nel database
      await supabase.from("email_logs").insert([
        {
          recipient: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ]);

      // Invia l'email tramite Edge Function
      const result = await sendEmailViaEdgeFunction(
        emailData.to,
        emailData.subject,
        emailData.body,
        emailData.from,
      );

      if (result) {
        toast({
          title: "Successo",
          description: "Email inviata con successo",
        });
      } else {
        toast({
          title: "Errore",
          description: "Impossibile inviare l'email",
          variant: "destructive",
        });
      }

      // Aggiorna i log
      fetchLogs();
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Errore",
        description: `Impossibile inviare l'email: ${error.message || "Errore sconosciuto"}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testDirectSendGrid = async () => {
    setLoading(true);
    try {
      // Registra il tentativo nel database
      await supabase.from("email_logs").insert([
        {
          recipient: emailData.to,
          subject: "Test diretto SendGrid",
          body: "<p>Test diretto API SendGrid</p>",
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ]);

      // Chiama direttamente l'API SendGrid (solo per test)
      const SENDGRID_API_KEY =
        "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";

      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: emailData.to }],
              subject: "Test diretto SendGrid",
            },
          ],
          from: { email: "noreply@fleetflow.com" },
          content: [
            { type: "text/html", value: "<p>Test diretto API SendGrid</p>" },
          ],
        }),
      });

      const responseText = await response.text();

      if (response.ok) {
        toast({
          title: "Successo",
          description: "Test diretto SendGrid completato con successo",
        });

        // Aggiorna il log
        await supabase
          .from("email_logs")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("recipient", emailData.to)
          .eq("subject", "Test diretto SendGrid")
          .eq("status", "pending");
      } else {
        toast({
          title: "Errore SendGrid",
          description: `Errore API: ${response.status} ${responseText}`,
          variant: "destructive",
        });

        // Aggiorna il log con l'errore
        await supabase
          .from("email_logs")
          .update({
            status: "error",
            error_message: `SendGrid API error: ${response.status} ${responseText}`,
            updated_at: new Date().toISOString(),
          })
          .eq("recipient", emailData.to)
          .eq("subject", "Test diretto SendGrid")
          .eq("status", "pending");
      }

      // Aggiorna i log
      fetchLogs();
    } catch (error) {
      console.error("Error in direct SendGrid test:", error);
      toast({
        title: "Errore",
        description: `Errore test diretto: ${error.message || "Errore sconosciuto"}`,
        variant: "destructive",
      });

      // Aggiorna il log con l'errore
      await supabase
        .from("email_logs")
        .update({
          status: "error",
          error_message: `Exception: ${error.message || "Unknown error"}`,
          updated_at: new Date().toISOString(),
        })
        .eq("recipient", emailData.to)
        .eq("subject", "Test diretto SendGrid")
        .eq("status", "pending");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow mb-8">
      <CardHeader>
        <CardTitle>Debug Email</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="to">Destinatario</Label>
              <Input
                id="to"
                name="to"
                value={emailData.to}
                onChange={handleChange}
                placeholder="email@esempio.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Oggetto</Label>
              <Input
                id="subject"
                name="subject"
                value={emailData.subject}
                onChange={handleChange}
                placeholder="Oggetto dell'email"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="from">Mittente (opzionale)</Label>
              <Input
                id="from"
                name="from"
                value={emailData.from}
                onChange={handleChange}
                placeholder="noreply@fleetflow.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="body">Contenuto HTML</Label>
              <Textarea
                id="body"
                name="body"
                value={emailData.body}
                onChange={handleChange}
                placeholder="Contenuto HTML dell'email"
                rows={6}
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleSendEmail}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Invio in corso..." : "Invia Email di Test"}
              </Button>

              <Button
                onClick={testDirectSendGrid}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                Test Diretto SendGrid
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Log Email</h3>
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                Aggiorna
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Destinatario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Oggetto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {log.recipient}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {log.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              log.status === "sent"
                                ? "bg-green-100 text-green-800"
                                : log.status === "error"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {log.status}
                          </span>
                          {log.error_message && (
                            <div className="text-xs text-red-500 mt-1">
                              {log.error_message}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailDebugPanel;
