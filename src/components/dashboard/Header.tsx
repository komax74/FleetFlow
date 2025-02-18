import React from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Bell,
  Calendar,
  Plus,
  LogOut,
  Settings,
  User,
  CarFront,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { changelog } from "./Changelog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface HeaderProps {
  onSettingsClick?: () => void;
  onProfileClick?: () => void;
  onCalendarClick?: () => void;
  setView?: (view: "grid" | "calendar") => void;
}

const Header = ({
  onSettingsClick = () => {},
  onProfileClick = () => {},
  onCalendarClick = () => {},
}: HeaderProps) => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  if (!user || !profile) return null;

  return (
    <header className="fixed top-0 left-0 right-0 h-[72px] z-50">
      <div className="relative h-full px-6 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Logo */}
          <div
            className="flex items-center space-x-2 px-2 cursor-pointer hover:bg-gray-100 rounded-lg"
            onClick={() => navigate("/")}
          >
            <CarFront className="h-6 w-6 text-primary" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">CarFleet</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-xs text-gray-500 cursor-pointer">
                      v.0.5
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="w-64 p-2">
                    <div className="space-y-3">
                      {changelog.slice(0, 2).map((entry) => (
                        <div key={entry.version} className="space-y-1">
                          <p className="text-xs font-medium">
                            Versione {entry.version}
                          </p>
                          <ul className="text-[11px] space-y-1">
                            {entry.changes.map((change, i) => (
                              <li key={i}>{change}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/book")}>
              <Plus className="h-4 w-4 mr-2" />
              Prenota Auto
            </Button>
            <Button variant="ghost" onClick={() => navigate("/my-bookings")}>
              <CarFront className="h-4 w-4 mr-2" />
              Le mie prenotazioni
            </Button>
            <Button variant="ghost" onClick={() => navigate("/calendar")}>
              <Calendar className="h-4 w-4 mr-2" />
              Calendario
            </Button>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar>
                  <AvatarImage
                    src={
                      profile.avatar_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.full_name}`
                    }
                    alt={profile.full_name || ""}
                  />
                  <AvatarFallback>
                    {profile.full_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile.full_name}</p>
                  <p className="text-xs text-gray-600">
                    {profile.company || "Azienda"}
                  </p>
                  <p className="text-xs text-gray-500">{profile.email}</p>
                  {profile.role === "admin" && (
                    <p className="text-xs text-gray-500">Admin</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Common menu items for all users */}
              <DropdownMenuItem onClick={() => navigate("/account")}>
                <User className="h-4 w-4 mr-2" />
                Account
              </DropdownMenuItem>

              {/* Admin-only menu items */}
              {profile.role === "admin" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate("/fleet-management")}
                  >
                    <CarFront className="h-4 w-4 mr-2" />
                    Gestione Veicoli
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate("/user-management")}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Gestione Utenti
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={onSettingsClick}>
                    <Settings className="h-4 w-4 mr-2" />
                    Impostazioni
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />

              {/* Logout */}
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Esci
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
