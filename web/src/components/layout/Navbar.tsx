import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { ThemeToggle } from '../ui/ThemeToggle.js';
import { Badge } from '../ui/Badge.js';
import { LogOut, User as UserIcon, Shield, Radio, Activity, Users, Settings, FileText, ChevronDown } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'ADMIN': return 'accent';
      case 'INSTRUCTOR': return 'info';
      case 'TRAINEE': return 'success';
      default: return 'default';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/85 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Brand Wordmark */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            {/* Partially faded signal bars glyph */}
            <div className="flex items-end gap-0.5 h-5 w-4 pb-0.5">
              <span className="w-1 h-1.5 bg-primary rounded-xs" />
              <span className="w-1 h-2.5 bg-primary rounded-xs" />
              <span className="w-1 h-3.5 bg-primary/70 rounded-xs" />
              <span className="w-1 h-4.5 bg-primary/30 rounded-xs" />
            </div>
            <span className="font-semibold tracking-wider text-base text-fg group-hover:text-primary transition-colors">
              DEGRADE
            </span>
          </Link>

          {/* Navigation Links based on role */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
              {user.role === 'TRAINEE' && (
                <Link
                  to="/play"
                  className={`px-3 py-1.5 rounded-control transition-colors ${
                    location.pathname.startsWith('/play')
                      ? 'bg-surface-2 text-fg font-semibold'
                      : 'text-muted hover:text-fg hover:bg-surface-2/60'
                  }`}
                >
                  Tactical Console
                </Link>
              )}

              {(user.role === 'INSTRUCTOR' || user.role === 'ADMIN') && (
                <>
                  <Link
                    to="/instructor"
                    className={`px-3 py-1.5 rounded-control transition-colors ${
                      location.pathname === '/instructor'
                        ? 'bg-surface-2 text-fg font-semibold'
                        : 'text-muted hover:text-fg hover:bg-surface-2/60'
                    }`}
                  >
                    Exercises
                  </Link>
                  <Link
                    to="/instructor/scenarios"
                    className={`px-3 py-1.5 rounded-control transition-colors ${
                      location.pathname.startsWith('/instructor/scenarios')
                        ? 'bg-surface-2 text-fg font-semibold'
                        : 'text-muted hover:text-fg hover:bg-surface-2/60'
                    }`}
                  >
                    Scenario Editor
                  </Link>
                </>
              )}

              {user.role === 'ADMIN' && (
                <>
                  <Link
                    to="/admin"
                    className={`px-3 py-1.5 rounded-control transition-colors ${
                      location.pathname === '/admin'
                        ? 'bg-surface-2 text-fg font-semibold'
                        : 'text-muted hover:text-fg hover:bg-surface-2/60'
                    }`}
                  >
                    Overview
                  </Link>
                  <Link
                    to="/admin/users"
                    className={`px-3 py-1.5 rounded-control transition-colors ${
                      location.pathname === '/admin/users'
                        ? 'bg-surface-2 text-fg font-semibold'
                        : 'text-muted hover:text-fg hover:bg-surface-2/60'
                    }`}
                  >
                    Users
                  </Link>
                  <Link
                    to="/admin/audit"
                    className={`px-3 py-1.5 rounded-control transition-colors ${
                      location.pathname === '/admin/audit'
                        ? 'bg-surface-2 text-fg font-semibold'
                        : 'text-muted hover:text-fg hover:bg-surface-2/60'
                    }`}
                  >
                    Audit
                  </Link>
                  <Link
                    to="/admin/settings"
                    className={`px-3 py-1.5 rounded-control transition-colors ${
                      location.pathname === '/admin/settings'
                        ? 'bg-surface-2 text-fg font-semibold'
                        : 'text-muted hover:text-fg hover:bg-surface-2/60'
                    }`}
                  >
                    Settings
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right: Role Badge, Theme Toggle & User Menu */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-control bg-surface-2 hover:bg-border/60 border border-border transition-colors text-xs"
              >
                <Badge variant={getRoleBadgeVariant(user.role) as any} size="sm">
                  {user.role}
                </Badge>
                <span className="font-medium text-fg hidden sm:inline">
                  {user.rank ? `${user.rank} ${user.username}` : user.username}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-1.5 w-56 rounded-card bg-surface border border-border shadow-xl py-1.5 z-50 text-xs">
                    <div className="px-3.5 py-2 border-b border-border/80">
                      <div className="font-medium text-fg">{user.username}</div>
                      <div className="text-muted text-[11px] mt-0.5">
                        {user.rank && <span>{user.rank} • </span>}
                        {user.unit || 'Standard Unit'}
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-danger hover:bg-danger/10 text-left transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="text-xs font-medium px-3 py-1.5 rounded-control bg-primary text-primary-fg hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
