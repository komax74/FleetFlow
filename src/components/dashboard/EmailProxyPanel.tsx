import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import { supabase } from "@/lib/supabase";
import { sendEmailViaProxy } from "@/lib/emailServiceProxy";

const EmailProxyPanel = () => {
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
      // Invia l'email tramite la funzione SQL proxy
      const result = await sendEmailViaProxy({
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        from: emailData.from,
      });

      if (result) {
        toast({
          title: "Successo",
          description: "Email inviata con successo tramite proxy SQL",
        });
      } else {
        toast({
          title: "Errore",
          description: "Impossibile inviare l'email tramite proxy SQL",
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

  const testDirectSQL = async () => {
    setLoading(true);
    try {
      // Chiama direttamente la funzione SQL
      const { data, error } = await supabase.rpc("send_email_proxy", {
        to_email: emailData.to,
        subject_text: "Test diretto SQL",
        body: "<p>Test diretto funzione SQL</p>",
        from_email: emailData.from || null,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Successo",
        description: "Test diretto SQL completato con successo: " + data,
      });

      // Aggiorna i log
      fetchLogs();
    } catch (error) {
      console.error("Error in direct SQL test:", error);
      toast({
        title: "Errore",
        description: `Errore test diretto SQL: ${error.message || "Errore sconosciuto"}`,
        variant: "destructive",
      });
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
        <CardTitle>Email via Proxy SQL</CardTitle>
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
                {loading ? "Invio in corso..." : "Invia Email via SQL"}
              </Button>

              <Button
                onClick={testDirectSQL}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                Test Diretto SQL
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
                                : log.status === "error" ||
                                    log.status === "failed"
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

export default EmailProxyPanel;
