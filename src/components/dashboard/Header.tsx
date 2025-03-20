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
  Calendar,
  Plus,
  LogOut,
  Settings,
  User,
  CarFront,
  Users,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { changelog } from "./Changelog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import NotificationSystem from "../notifications/NotificationSystem.jsx";

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
    <header className="fixed top-0 left-0 right-0 h-[72px] z-50 bg-transparent backdrop-blur-md">
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
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-gray-500 cursor-pointer">
                        v.0.9.6
                      </span>
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
          </div>

          {/* Navigation - Desktop */}
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
            <Button
              variant="ghost"
              onClick={() => navigate("/booking-history")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Storico Prenotazioni
            </Button>
            <Button variant="ghost" onClick={() => navigate("/map")}>
              <MapPin className="h-4 w-4 mr-2" />
              Mappa Veicoli
            </Button>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <NotificationSystem />

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-menu"
                  >
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/book")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Prenota Auto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/my-bookings")}>
                  <CarFront className="h-4 w-4 mr-2" />
                  Le mie prenotazioni
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/calendar")}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendario
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/booking-history")}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Storico Prenotazioni
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/map")}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Mappa Veicoli
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {profile.role === "admin" && (
                  <>
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
                    <DropdownMenuItem
                      onClick={() => navigate("/notifications/send")}
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
                        className="h-4 w-4 mr-2"
                      >
                        <path d="M22 2L11 13" />
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                      </svg>
                      Invia Notifiche
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      <Settings className="h-4 w-4 mr-2" />
                      Impostazioni
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

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

              {/* Common notification menu items */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/notifications/browser-test")}
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
                  className="h-4 w-4 mr-2"
                >
                  <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
                </svg>
                Test Browser
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/notifications/safari-guide")}
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
                  className="h-4 w-4 mr-2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
                Guida Safari
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

                  <DropdownMenuItem
                    onClick={() => navigate("/notifications/send")}
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
                      className="h-4 w-4 mr-2"
                    >
                      <path d="M22 2L11 13" />
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                    </svg>
                    Invia Notifiche
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/notifications/debug")}
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
                      className="h-4 w-4 mr-2"
                    >
                      <path d="M12 9v4" />
                      <path d="M12 17h.01" />
                      <path d="M3.34 17a10 10 0 1 1 17.32 0" />
                    </svg>
                    Debug Notifiche
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/notifications/guide")}
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
                      className="h-4 w-4 mr-2"
                    >
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    Guida Notifiche
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/notifications/email-config")}
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
                      className="h-4 w-4 mr-2"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    Config Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
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
