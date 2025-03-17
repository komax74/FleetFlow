import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useToast } from "../ui/use-toast";
import Header from "../dashboard/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const NotificationTestGuide = () => {
  const { toast } = useToast();

  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Guida Test Notifiche</h1>
          </div>

          <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow mb-8">
            <CardHeader>
              <CardTitle>Come testare le notifiche</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="fcm">
                <TabsList className="mb-4">
                  <TabsTrigger value="fcm">FCM Token</TabsTrigger>
                  <TabsTrigger value="devices">
                    Registrazione Dispositivi
                  </TabsTrigger>
                  <TabsTrigger value="email">Test Email</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow Completo</TabsTrigger>
                </TabsList>

                <TabsContent value="fcm" className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Come ottenere un FCM Token
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Il FCM Token (Firebase Cloud Messaging) è necessario per
                    inviare notifiche push ai dispositivi. Ecco come ottenerlo:
                  </p>

                  <ol className="list-decimal pl-5 space-y-3">
                    <li>
                      <strong>Attiva le notifiche nel browser</strong>: Quando
                      visiti il sito per la prima volta, dovresti vedere un
                      popup che chiede il permesso per le notifiche. Accetta
                      questo permesso.
                    </li>
                    <li>
                      <strong>Verifica nel pannello di debug</strong>: Una volta
                      concesso il permesso, il token FCM dovrebbe apparire
                      automaticamente nel campo "FCM Token Corrente" nella
                      scheda "Test Notifiche".
                    </li>
                    <li>
                      <strong>Ricarica la pagina</strong>: Se il token non
                      appare, prova a ricaricare la pagina. Il token viene
                      salvato in localStorage e dovrebbe essere caricato
                      all'avvio.
                    </li>
                    <li>
                      <strong>Controlla la console</strong>: Se stai usando
                      Chrome, apri gli strumenti di sviluppo (F12) e controlla
                      la console per eventuali messaggi relativi al token FCM.
                    </li>
                  </ol>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-4">
                    <h4 className="font-medium text-yellow-800 mb-2">
                      Nota importante
                    </h4>
                    <p className="text-yellow-700">
                      Il token FCM viene generato solo se il browser supporta le
                      notifiche push e se l'utente ha concesso il permesso.
                      Alcuni browser o configurazioni potrebbero non supportare
                      questa funzionalità.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="devices" className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Come registrare i dispositivi
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Per ricevere notifiche push su un dispositivo mobile, è
                    necessario registrarlo. Ecco come fare:
                  </p>

                  <ol className="list-decimal pl-5 space-y-3">
                    <li>
                      <strong>Visita il sito da mobile</strong>: Apri il sito
                      sul tuo smartphone utilizzando Chrome o Safari.
                    </li>
                    <li>
                      <strong>Accetta i permessi</strong>: Quando richiesto,
                      concedi il permesso per le notifiche. Su alcuni
                      dispositivi, potrebbe essere necessario abilitare le
                      notifiche anche nelle impostazioni del browser.
                    </li>
                    <li>
                      <strong>Aggiungi alla schermata home</strong>: Per una
                      migliore esperienza, aggiungi l'app alla schermata home
                      del tuo dispositivo. Su iOS, usa il pulsante "Condividi" e
                      poi "Aggiungi a Home". Su Android, usa il menu del browser
                      e seleziona "Aggiungi a schermata Home".
                    </li>
                    <li>
                      <strong>Verifica la registrazione</strong>: Dopo aver
                      completato questi passaggi, il dispositivo dovrebbe
                      apparire nella scheda "Dispositivi" del pannello di debug
                      delle notifiche.
                    </li>
                  </ol>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                    <h4 className="font-medium text-blue-800 mb-2">
                      Suggerimento
                    </h4>
                    <p className="text-blue-700">
                      Se il dispositivo non appare nell'elenco, prova a fare
                      logout e login nuovamente. Questo può forzare la
                      registrazione del dispositivo.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="email" className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Come testare l'invio di email
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Per testare l'invio di email, puoi utilizzare il pannello di
                    debug delle notifiche. Ecco come fare:
                  </p>

                  <ol className="list-decimal pl-5 space-y-3">
                    <li>
                      <strong>Configura il template email</strong>: Nella scheda
                      "Template Email" del pannello di debug, puoi
                      personalizzare il template HTML che verrà utilizzato per
                      le email.
                    </li>
                    <li>
                      <strong>Invia una notifica di test</strong>: Nella scheda
                      "Test Notifiche", compila i campi e invia una notifica di
                      test. Se configurato correttamente, il sistema tenterà di
                      inviare anche un'email.
                    </li>
                    <li>
                      <strong>Verifica i log</strong>: Nella scheda "Log
                      Notifiche", puoi vedere i tentativi di invio email. Nota
                      che in ambiente di sviluppo, le email non vengono
                      effettivamente inviate ma solo simulate.
                    </li>
                  </ol>

                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 mt-4">
                    <h4 className="font-medium text-red-800 mb-2">
                      Importante
                    </h4>
                    <p className="text-red-700">
                      Per l'invio effettivo di email in produzione, è necessario
                      configurare un servizio di invio email come SendGrid,
                      Mailgun o Amazon SES. Questa configurazione deve essere
                      fatta lato server e non è inclusa nel pannello di debug.
                    </p>
                    <div className="mt-2">
                      <a
                        href="/notifications/email-config"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
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
                        Guida alla configurazione email
                      </a>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="workflow" className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Workflow completo di test
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Ecco un workflow completo per testare il sistema di
                    notifiche:
                  </p>

                  <ol className="list-decimal pl-5 space-y-3">
                    <li>
                      <strong>Preparazione</strong>: Assicurati di aver concesso
                      i permessi per le notifiche nel browser e di aver
                      registrato almeno un dispositivo.
                    </li>
                    <li>
                      <strong>Invia una notifica di test</strong>: Nella scheda
                      "Test Notifiche", compila i campi e invia una notifica di
                      test.
                    </li>
                    <li>
                      <strong>Verifica la ricezione</strong>: Controlla che la
                      notifica appaia nel menu a campanella in alto a destra. Se
                      hai configurato correttamente le notifiche push, dovresti
                      ricevere anche una notifica push sul browser.
                    </li>
                    <li>
                      <strong>Verifica i log</strong>: Nella scheda "Log
                      Notifiche", dovresti vedere la notifica appena inviata.
                    </li>
                    <li>
                      <strong>Test su dispositivo mobile</strong>: Se hai
                      registrato un dispositivo mobile, verifica che la notifica
                      arrivi anche lì.
                    </li>
                  </ol>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4">
                    <h4 className="font-medium text-green-800 mb-2">
                      Suggerimento per il debug
                    </h4>
                    <p className="text-green-700">
                      Se le notifiche non funzionano come previsto, controlla la
                      console del browser per eventuali errori. Assicurati che
                      il service worker sia registrato correttamente e che il
                      token FCM sia valido.
                    </p>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-4">
                    <h4 className="font-medium text-yellow-800 mb-2">
                      Compatibilità browser
                    </h4>
                    <p className="text-yellow-700 mb-2">
                      Le notifiche push funzionano in modo diverso su browser e
                      sistemi operativi diversi:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-yellow-700">
                      <li>
                        <strong>Chrome (desktop/Android)</strong>: Supporto
                        completo per le notifiche push
                      </li>
                      <li>
                        <strong>Firefox</strong>: Supporto per le notifiche, ma
                        potrebbe richiedere configurazioni aggiuntive
                      </li>
                      <li>
                        <strong>Safari (macOS)</strong>: Supporto limitato,
                        richiede configurazioni specifiche
                      </li>
                      <li>
                        <strong>Safari (iOS)</strong>: Non supporta le notifiche
                        push per le web app, usa le notifiche in-app
                      </li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => {
                      // Crea una notifica di test nel browser
                      if (Notification.permission === "granted") {
                        new Notification("Test Notifica Browser", {
                          body: "Questa è una notifica di test direttamente dal browser",
                          icon: "/vite.svg",
                        });
                        toast({
                          title: "Notifica inviata",
                          description:
                            "Una notifica di test è stata inviata direttamente dal browser",
                        });
                      } else {
                        toast({
                          title: "Permesso negato",
                          description:
                            "Il permesso per le notifiche non è stato concesso",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="mt-4"
                  >
                    Testa Notifica Browser
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotificationTestGuide;
