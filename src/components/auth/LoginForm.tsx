import { useState } from "react";
import { Car } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const { signIn } = useAuth();
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors = { email: "", password: "" };
    let isValid = true;

    if (!email) {
      newErrors.email = "Email obbligatoria";
      isValid = false;
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      newErrors.email = "Indirizzo email non valido";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "Password obbligatoria";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "La password deve contenere almeno 6 caratteri";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      await signIn(email, password);
      toast({
        title: "Accesso riuscito",
        description: "Bentornato!",
      });
    } catch (error) {
      setErrors({
        email: "Email o password non validi",
        password: "Email o password non validi",
      });
      toast({
        title: "Errore",
        description: "Email o password non validi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-black p-3 rounded-2xl">
            <Car className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-2">FleetFlow</h1>
        <p className="text-gray-600">Gestione flotta aziendale</p>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accesso</CardTitle>
          <CardDescription>
            Inserisci le tue credenziali per accedere al sistema di gestione
            della flotta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Inserisci la tua email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: "" });
                }}
                className={errors.email ? "border-red-500" : ""}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-red-500 mt-1">
                  {errors.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Inserisci la tua password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: "" });
                }}
                className={errors.password ? "border-red-500" : ""}
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-red-500 mt-1">
                  {errors.password}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email || !password}
            >
              {loading ? "Caricamento..." : "Accedi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
