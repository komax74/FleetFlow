import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "../ui/button";
import { Pencil } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useToast } from "../ui/use-toast";
import { supabase } from "@/lib/supabase";
import Header from "./Header";

const AccountSettings = () => {
  const { user, profile } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    company: "",
  });
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        company: profile.company || "",
      });
      setHasChanges(false);
    }
  }, [profile]);

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update profile data if changed
      if (
        formData.full_name !== profile?.full_name ||
        formData.company !== profile?.company
      ) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            company: formData.company,
          })
          .eq("id", user.id);

        if (profileError) throw profileError;
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast({
            title: "Errore",
            description: "Le password non coincidono",
            variant: "destructive",
          });
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) throw passwordError;
      }

      toast({
        title: "Successo",
        description: "Account aggiornato con successo",
      });
      setNewPassword("");
      setConfirmPassword("");
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non coincidono",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Password aggiornata con successo",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) return null;

  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[600px] mx-auto">
          <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Il Tuo Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture and Name */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback>{profile.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="space-y-4">
                  <div>
                    <Label>Nome Completo</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        value={formData.full_name}
                        onChange={(e) =>
                          handleFormChange("full_name", e.target.value)
                        }
                        className="h-9"
                      />
                      <div className="text-gray-400">
                        <Pencil className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Azienda</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        value={formData.company}
                        onChange={(e) =>
                          handleFormChange("company", e.target.value)
                        }
                        placeholder="Inserisci la tua azienda"
                        className="h-9"
                      />
                      <div className="text-gray-400">
                        <Pencil className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Ruolo</Label>
                    <p className="text-sm text-gray-500 mt-2">
                      {profile.role === "admin" ? "Amministratore" : "Utente"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Display */}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email} disabled />
                <p className="text-sm text-muted-foreground">
                  Contatta il supporto per modificare l'indirizzo email
                </p>
              </div>

              {/* Password Change Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nuova Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setHasChanges(true);
                    }}
                    placeholder="Inserisci la nuova password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Conferma Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setHasChanges(true);
                    }}
                    placeholder="Conferma la nuova password"
                  />
                </div>

                <Button
                  type="submit"
                  className={`w-full ${!loading && (hasChanges || newPassword) ? "bg-blue-500 hover:bg-blue-600" : ""}`}
                  disabled={loading || (!hasChanges && !newPassword)}
                >
                  {loading ? "Aggiornamento..." : "Aggiorna Account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
