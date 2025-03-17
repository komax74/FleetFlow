import React from "react";
import { Button } from "../ui/button";
import { useToast } from "../ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Header from "../dashboard/Header";

const BrowserNotificationTest = () => {
  const { toast } = useToast();
  const [browserInfo, setBrowserInfo] = React.useState<{
    browser: string;
    os: string;
    notificationsSupported: boolean;
    permissionStatus: string;
  }>({
    browser: "Sconosciuto",
    os: "Sconosciuto",
    notificationsSupported: false,
    permissionStatus: "default",
  });

  React.useEffect(() => {
    // Rileva browser e sistema operativo
    const userAgent = navigator.userAgent;
    let browser = "Sconosciuto";
    let os = "Sconosciuto";

    // Rileva browser
    if (userAgent.indexOf("Chrome") > -1) {
      browser = "Chrome";
    } else if (userAgent.indexOf("Safari") > -1) {
      browser = "Safari";
    } else if (userAgent.indexOf("Firefox") > -1) {
      browser = "Firefox";
    } else if (
      userAgent.indexOf("MSIE") > -1 ||
      userAgent.indexOf("Trident") > -1
    ) {
      browser = "Internet Explorer";
    } else if (userAgent.indexOf("Edge") > -1) {
      browser = "Edge";
    }

    // Rileva sistema operativo
    if (userAgent.indexOf("Win") > -1) {
      os = "Windows";
    } else if (userAgent.indexOf("Mac") > -1) {
      os = "macOS";
    } else if (
      userAgent.indexOf("iPhone") > -1 ||
      userAgent.indexOf("iPad") > -1
    ) {
      os = "iOS";
    } else if (userAgent.indexOf("Android") > -1) {
      os = "Android";
    } else if (userAgent.indexOf("Linux") > -1) {
      os = "Linux";
    }

    // Verifica supporto notifiche
    const notificationsSupported = "Notification" in window;

    // Forza il controllo del permesso attuale
    let permissionStatus = "non supportato";
    if (notificationsSupported) {
      // Leggi direttamente dalla proprietà Notification.permission
      permissionStatus = window.Notification.permission;
      console.log("Permesso notifiche rilevato:", permissionStatus);
    }

    setBrowserInfo({
      browser,
      os,
      notificationsSupported,
      permissionStatus,
    });

    // Aggiorna lo stato ogni secondo per rilevare cambiamenti
    const intervalId = setInterval(() => {
      if (
        notificationsSupported &&
        window.Notification.permission !== permissionStatus
      ) {
        console.log(
          "Permesso notifiche cambiato da",
          permissionStatus,
          "a",
          window.Notification.permission,
        );
        setBrowserInfo((prev) => ({
          ...prev,
          permissionStatus: window.Notification.permission,
        }));
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const requestPermission = async () => {
    if (!browserInfo.notificationsSupported) {
      toast({
        title: "Errore",
        description: "Il tuo browser non supporta le notifiche",
        variant: "destructive",
      });
      return;
    }

    try {
      // Forza il reset dello stato delle notifiche
      localStorage.removeItem("notifications_ignored");

      // Richiedi esplicitamente il permesso
      console.log("Richiesta permesso notifiche...");
      const permission = await window.Notification.requestPermission();
      console.log("Permesso notifiche:", permission);

      // Aggiorna lo stato dell'interfaccia
      setBrowserInfo({
        ...browserInfo,
        permissionStatus: permission,
      });

      if (permission === "granted") {
        toast({
          title: "Successo",
          description: "Permesso per le notifiche concesso",
        });

        // Genera un token simulato
        const mockToken = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem("fcmToken", mockToken);
        console.log("Token simulato generato:", mockToken);
      } else if (permission === "denied") {
        toast({
          title: "Permesso negato",
          description: "Hai negato il permesso per le notifiche",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Permesso ignorato",
          description: "Hai ignorato la richiesta di permesso",
        });
      }
    } catch (error) {
      console.error("Errore nella richiesta di permesso:", error);
      toast({
        title: "Errore",
        description:
          "Si è verificato un errore durante la richiesta di permesso",
        variant: "destructive",
      });
    }
  };

  const sendTestNotification = () => {
    // Forza il controllo del permesso attuale
    const currentPermission = window.Notification.permission;
    console.log("Permesso notifiche attuale:", currentPermission);

    if (currentPermission !== "granted") {
      toast({
        title: "Errore",
        description: "Devi prima concedere il permesso per le notifiche",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Invio notifica di test...");
      const notification = new window.Notification("Test Notifica", {
        body: "Questa è una notifica di test dal browser",
        icon: "/vite.svg",
        tag: `test-${Date.now()}`,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        toast({
          title: "Notifica cliccata",
          description: "Hai cliccato sulla notifica di test",
        });
      };

      toast({
        title: "Notifica inviata",
        description: "Una notifica di test è stata inviata",
      });
      console.log("Notifica inviata con successo");
    } catch (error) {
      console.error("Errore nell'invio della notifica:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio della notifica",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Test Notifiche Browser</h1>
          </div>

          <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow mb-8">
            <CardHeader>
              <CardTitle>Informazioni sul browser</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">
                      Dettagli ambiente
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Browser:</span>
                        <span>{browserInfo.browser}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Sistema operativo:</span>
                        <span>{browserInfo.os}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Supporto notifiche:</span>
                        <span>
                          {browserInfo.notificationsSupported ? "Sì" : "No"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Stato permesso:</span>
                        <span
                          className={`font-medium ${browserInfo.permissionStatus === "granted" ? "text-green-600" : browserInfo.permissionStatus === "denied" ? "text-red-600" : "text-yellow-600"}`}
                        >
                          {browserInfo.permissionStatus === "granted"
                            ? "Concesso"
                            : browserInfo.permissionStatus === "denied"
                              ? "Negato"
                              : browserInfo.permissionStatus === "default"
                                ? "Non richiesto"
                                : browserInfo.permissionStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Button
                      onClick={requestPermission}
                      disabled={
                        !browserInfo.notificationsSupported ||
                        browserInfo.permissionStatus === "denied"
                      }
                      className="w-full"
                    >
                      Richiedi permesso notifiche
                    </Button>

                    <Button
                      onClick={sendTestNotification}
                      disabled={browserInfo.permissionStatus !== "granted"}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Invia notifica di test
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h3 className="text-lg font-medium text-blue-800 mb-2">
                      Compatibilità browser
                    </h3>
                    <p className="text-blue-700 mb-4">
                      Le notifiche push funzionano in modo diverso su browser e
                      sistemi operativi diversi. Ecco cosa aspettarsi:
                    </p>
                    <ul className="space-y-2 text-blue-700">
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Chrome:</span>
                        <span>Supporto completo per le notifiche push</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Firefox:</span>
                        <span>
                          Supporto per le notifiche, ma potrebbe richiedere
                          configurazioni aggiuntive
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Safari (macOS):</span>
                        <span>
                          Supporto limitato, richiede configurazioni specifiche
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Safari (iOS):</span>
                        <span>
                          Non supporta le notifiche push per le web app, usa le
                          notifiche in-app
                        </span>
                      </li>
                    </ul>
                  </div>

                  {browserInfo.os === "iOS" && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h3 className="text-lg font-medium text-yellow-800 mb-2">
                        Nota per iOS
                      </h3>
                      <p className="text-yellow-700 mb-2">
                        Su iOS, Safari non supporta le notifiche push per le web
                        app. Ti consigliamo di utilizzare le notifiche in-app
                        all'interno dell'applicazione.
                      </p>
                      <a
                        href="/notifications/safari-guide"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
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
                        >
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                        </svg>
                        Consulta la guida completa per Safari iOS
                      </a>
                    </div>
                  )}

                  {browserInfo.browser === "Safari" &&
                    browserInfo.os === "macOS" && (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h3 className="text-lg font-medium text-yellow-800 mb-2">
                          Nota per Safari su macOS
                        </h3>
                        <p className="text-yellow-700 mb-2">
                          Su Safari macOS, le notifiche web richiedono un
                          certificato push Apple e configurazioni specifiche.
                          Potresti non vedere il popup di richiesta permesso
                          come su altri browser.
                        </p>
                        <a
                          href="/notifications/safari-guide"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
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
                          >
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                          </svg>
                          Consulta la guida completa per Safari macOS
                        </a>
                      </div>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BrowserNotificationTest;
