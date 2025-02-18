import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ImageUpload } from "../ui/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Plus, Settings, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "../ui/use-toast";
import Header from "./Header";

interface User {
  id: string;
  email: string;
  full_name: string;
  company: string;
  role: "admin" | "user";
  avatar_url?: string;
  password?: string;
}

const UserManagement = () => {
  const { profile: currentUserProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    company: "",
    role: "user" as const,
    avatar_url: "",
  });
  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare gli utenti",
        variant: "destructive",
      });
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) {
      setFormErrors((prev) => ({ ...prev, email: "Formato email non valido" }));
      return false;
    }
    setFormErrors((prev) => ({ ...prev, email: "" }));
    return true;
  };

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      setFormErrors((prev) => ({
        ...prev,
        password: "La password deve essere di almeno 6 caratteri",
      }));
      return false;
    }
    setFormErrors((prev) => ({ ...prev, password: "" }));
    return true;
  };

  const createUser = async () => {
    if (!validateEmail(newUser.email) || !validatePassword(newUser.password))
      return;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        user_metadata: {
          full_name: newUser.full_name,
          company: newUser.company,
          role: newUser.role,
        },
      });

      if (authError) throw authError;
      if (!authData.user)
        throw new Error("Nessun utente restituito dalla registrazione");

      const { error: profileError } = await supabase.from("profiles").upsert([
        {
          id: authData.user.id,
          email: newUser.email,
          full_name: newUser.full_name,
          company: newUser.company,
          role: newUser.role,
          avatar_url:
            newUser.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.full_name}`,
        },
      ]);

      if (profileError) throw profileError;

      toast({
        title: "Successo",
        description: "Utente creato con successo",
      });

      fetchUsers();
      setNewUser({
        email: "",
        password: "",
        full_name: "",
        company: "",
        role: "user",
        avatar_url: "",
      });
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Errore",
        description: "Impossibile creare l'utente",
        variant: "destructive",
      });
    }
  };

  const updateUser = async () => {
    if (!editingUser) return;
    try {
      // Update password if provided
      if (editingUser.password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: editingUser.password,
        });

        if (passwordError) {
          console.error("Error updating password:", passwordError);
          throw passwordError;
        }
      }

      // Update profile
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: editingUser.full_name,
          company: editingUser.company,
          role: editingUser.role,
          avatar_url: editingUser.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingUser.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating user:", error);
        throw error;
      }

      toast({
        title: "Successo",
        description: "Utente aggiornato con successo",
      });

      await fetchUsers();
      setShowEditDialog(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'utente",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userToDelete.id);

      if (error) {
        console.error("Error deleting profile:", error);
        throw error;
      }

      toast({
        title: "Successo",
        description: "Utente eliminato con successo",
      });

      await fetchUsers();
      setShowDeleteDialog(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'utente",
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
            <h1 className="text-3xl font-bold">Gestione Utenti</h1>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-black text-white hover:bg-gray-800">
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi Utente
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[20px]">
                <DialogHeader>
                  <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
                  <DialogDescription>
                    Crea un nuovo account utente
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        newUser.avatar_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.full_name || "default"}`
                      }
                      alt="Avatar"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                    <ImageUpload
                      onUpload={(file, compressedUrl) => {
                        setNewUser({ ...newUser, avatar_url: compressedUrl });
                      }}
                      maxSizeMB={0.5}
                      maxWidthOrHeight={256}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => {
                        setNewUser({ ...newUser, email: e.target.value });
                        validateEmail(e.target.value);
                      }}
                      className={formErrors.email ? "border-red-500" : ""}
                    />
                    {formErrors.email && (
                      <p className="text-sm text-red-500 mt-1">
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => {
                        setNewUser({ ...newUser, password: e.target.value });
                        validatePassword(e.target.value);
                      }}
                      className={formErrors.password ? "border-red-500" : ""}
                    />
                    {formErrors.password && (
                      <p className="text-sm text-red-500 mt-1">
                        {formErrors.password}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={newUser.full_name}
                      onChange={(e) =>
                        setNewUser({ ...newUser, full_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="company">Azienda</Label>
                    <Input
                      id="company"
                      value={newUser.company}
                      onChange={(e) =>
                        setNewUser({ ...newUser, company: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Ruolo</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: "admin" | "user") =>
                        setNewUser({ ...newUser, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona ruolo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Utente</SelectItem>
                        <SelectItem value="admin">Amministratore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={createUser}
                    disabled={
                      !newUser.email ||
                      !newUser.password ||
                      !newUser.full_name ||
                      !newUser.role ||
                      !!formErrors.email ||
                      !!formErrors.password
                    }
                  >
                    Crea Utente
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <Card
                key={user.id}
                className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-medium">
                        {user.full_name}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-gray-100 rounded-full"
                        onClick={() => {
                          setEditingUser(user);
                          setShowEditDialog(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      {currentUserProfile?.role === "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-red-100 rounded-full text-red-500"
                          onClick={() => {
                            setUserToDelete(user);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        user.avatar_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.full_name}`
                      }
                      alt={user.full_name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm text-gray-600">
                        Ruolo:{" "}
                        <span
                          className={`font-medium ${user.role === "admin" ? "text-purple-600" : "text-blue-600"}`}
                        >
                          {user.role === "admin" ? "Amministratore" : "Utente"}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Azienda: {user.company || "N/D"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edit User Dialog */}
          {showEditDialog && editingUser && (
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="rounded-[20px]">
                <DialogHeader>
                  <DialogTitle>Modifica Utente</DialogTitle>
                  <DialogDescription>
                    Aggiorna le informazioni dell'utente
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        editingUser.avatar_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${editingUser.full_name || "default"}`
                      }
                      alt="Avatar"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                    <ImageUpload
                      onUpload={(file, compressedUrl) => {
                        setEditingUser({
                          ...editingUser,
                          avatar_url: compressedUrl,
                        });
                      }}
                      maxSizeMB={0.5}
                      maxWidthOrHeight={256}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-full-name">Nome Completo</Label>
                    <Input
                      id="edit-full-name"
                      value={editingUser.full_name || ""}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          full_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-company">Azienda</Label>
                    <Input
                      id="edit-company"
                      value={editingUser.company || ""}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          company: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-password">Nuova Password</Label>
                    <Input
                      id="edit-password"
                      type="password"
                      placeholder="Lascia vuoto per non modificare"
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          password: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-role">Ruolo</Label>
                    <Select
                      value={editingUser.role || "user"}
                      onValueChange={(value: "admin" | "user") =>
                        setEditingUser({
                          ...editingUser,
                          role: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Utente</SelectItem>
                        <SelectItem value="admin">Amministratore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={updateUser}
                    disabled={!editingUser.full_name}
                  >
                    Salva Modifiche
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Delete User Dialog */}
          {showDeleteDialog && userToDelete && (
            <AlertDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
            >
              <AlertDialogContent className="rounded-[20px]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Elimina Utente</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sei sicuro di voler eliminare questo utente? Questa azione
                    non può essere annullata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
                    Annulla
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-500 hover:bg-red-600"
                    onClick={deleteUser}
                  >
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
