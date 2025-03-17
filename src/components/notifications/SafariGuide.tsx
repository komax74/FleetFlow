import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Header from "../dashboard/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Code } from "lucide-react";

const SafariGuide = () => {
  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Guida Notifiche per Safari</h1>
          </div>

          <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow mb-8">
            <CardHeader>
              <CardTitle>Configurazione notifiche per Safari</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <Code className="h-4 w-4" />
                <AlertTitle>Importante</AlertTitle>
                <AlertDescription>
                  Safari gestisce le notifiche in modo diverso rispetto ad altri
                  browser. Questa guida ti aiuterà a configurare le notifiche
                  per Safari su macOS e iOS.
                </AlertDescription>
              </Alert>

              <Tabs defaultValue="macos">
                <TabsList className="mb-4">
                  <TabsTrigger value="macos">Safari macOS</TabsTrigger>
                  <TabsTrigger value="ios">Safari iOS</TabsTrigger>
                  <TabsTrigger value="alternative">Alternative</TabsTrigger>
                </TabsList>

                <TabsContent value="macos" className="space-y-4">
                  <h3 className="text-lg font-medium">Safari su macOS</h3>
                  <p className="text-gray-700 mb-4">
                    Safari su macOS richiede una configurazione speciale per le
                    notifiche push web. A differenza di Chrome e Firefox, Safari
                    richiede un certificato push Apple e una configurazione
                    server-side specifica.
                  </p>

                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="font-medium text-blue-800 mb-2">
                        Configurazione per l'utente
                      </h4>
                      <ol className="list-decimal pl-5 space-y-2 text-blue-700">
                        <li>Apri Safari e vai al sito web</li>
                        <li>Fai clic su Safari nella barra dei menu</li>
                        <li>Seleziona "Impostazioni per questo sito web..."</li>
                        <li>Nella sezione "Notifiche", seleziona "Consenti"</li>
                        <li>
                          Verifica nelle Preferenze di Sistema → Notifiche →
                          Safari che le notifiche siano abilitate
                        </li>
                      </ol>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        Limitazioni
                      </h4>
                      <p className="text-yellow-700">
                        Anche dopo aver configurato correttamente le notifiche
                        in Safari, potresti non vedere il popup di richiesta
                        permesso come su altri browser. Safari gestisce i
                        permessi a livello di sistema operativo.
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="font-medium text-gray-800 mb-2">
                        Configurazione tecnica (per sviluppatori)
                      </h4>
                      <p className="text-gray-700 mb-2">
                        Per supportare completamente le notifiche push su Safari
                        macOS, è necessario:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-gray-700">
                        <li>Registrare un certificato push Apple Developer</li>
                        <li>
                          Configurare un server web per gestire le notifiche
                          push di Safari
                        </li>
                        <li>
                          Implementare il protocollo Apple Push Notification
                          Service (APNs)
                        </li>
                        <li>
                          Creare un file manifest.json specifico per Safari
                        </li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ios" className="space-y-4">
                  <h3 className="text-lg font-medium">Safari su iOS</h3>
                  <p className="text-gray-700 mb-4">
                    Safari su iOS{" "}
                    <strong>
                      non supporta le notifiche push per le web app
                    </strong>
                    . Questa è una limitazione tecnica di iOS e non può essere
                    aggirata con configurazioni standard.
                  </p>

                  <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-medium text-red-800 mb-2">
                        Limitazione tecnica
                      </h4>
                      <p className="text-red-700">
                        Apple non consente alle web app di inviare notifiche
                        push su iOS. Questa è una restrizione della piattaforma
                        e non un problema dell'applicazione.
                      </p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="font-medium text-blue-800 mb-2">
                        Alternative per iOS
                      </h4>
                      <ol className="list-decimal pl-5 space-y-2 text-blue-700">
                        <li>
                          <strong>App nativa iOS</strong>: La soluzione migliore
                          è sviluppare un'app nativa iOS che può inviare
                          notifiche push.
                        </li>
                        <li>
                          <strong>Notifiche in-app</strong>: Utilizza le
                          notifiche in-app quando l'utente è attivo
                          nell'applicazione web.
                        </li>
                        <li>
                          <strong>Notifiche email</strong>: Invia notifiche
                          importanti via email come alternativa.
                        </li>
                        <li>
                          <strong>SMS</strong>: Per notifiche critiche,
                          considera l'invio di SMS.
                        </li>
                      </ol>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 mb-2">
                        Suggerimento
                      </h4>
                      <p className="text-green-700">
                        Aggiungi l'app alla schermata Home di iOS per una
                        migliore esperienza utente. Anche se non riceverai
                        notifiche push, avrai un'icona dedicata e un'esperienza
                        più simile a un'app nativa.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="alternative" className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Alternative per Safari
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Dato che Safari ha limitazioni significative per le
                    notifiche push, ecco alcune alternative da considerare:
                  </p>

                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="font-medium text-blue-800 mb-2">
                        1. Utilizzare browser alternativi
                      </h4>
                      <p className="text-blue-700 mb-2">
                        Suggerisci agli utenti di utilizzare browser alternativi
                        che supportano meglio le notifiche push:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-blue-700">
                        <li>
                          <strong>macOS</strong>: Chrome, Firefox, Edge
                        </li>
                        <li>
                          <strong>iOS</strong>: Chrome (con limitazioni minori)
                        </li>
                      </ul>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 mb-2">
                        2. Implementare un sistema di polling
                      </h4>
                      <p className="text-green-700 mb-2">
                        Quando l'utente è attivo nell'applicazione, implementa
                        un sistema di polling che controlla periodicamente le
                        nuove notifiche:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-green-700">
                        <li>Controlla nuove notifiche ogni 30-60 secondi</li>
                        <li>Mostra notifiche in-app quando vengono rilevate</li>
                        <li>Aggiorna il contatore delle notifiche non lette</li>
                      </ul>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="font-medium text-purple-800 mb-2">
                        3. Sviluppare un'app nativa
                      </h4>
                      <p className="text-purple-700 mb-2">
                        Per casi d'uso aziendali critici, considera lo sviluppo
                        di app native:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-purple-700">
                        <li>App iOS nativa per utenti iPhone/iPad</li>
                        <li>App macOS nativa per utenti Mac</li>
                        <li>
                          Utilizza framework come React Native o Flutter per
                          condividere codice tra piattaforme
                        </li>
                      </ul>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        4. Strategie multi-canale
                      </h4>
                      <p className="text-yellow-700 mb-2">
                        Implementa una strategia di notifiche multi-canale:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-yellow-700">
                        <li>Notifiche push (dove supportate)</li>
                        <li>Notifiche in-app (per tutti i browser)</li>
                        <li>Email per notifiche importanti</li>
                        <li>SMS per notifiche critiche</li>
                        <li>
                          Integrazione con sistemi di messaggistica aziendale
                          (Slack, Teams, ecc.)
                        </li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SafariGuide;
