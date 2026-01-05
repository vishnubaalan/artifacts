import {
  FaSearch,
  FaBell,
  FaCog,
  FaChevronDown,
  FaBars,
  FaUser,
  FaCloud,
  FaSignOutAlt,
} from "react-icons/fa";

import { Input } from "../ui/input";
import { ModeToggle } from "../mode-toggle";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";

const Header = ({
  searchQuery,
  setSearchQuery,
  title,
  showSearch = true,
  onMenuClick,
}) => {
  return (
    <header
      role="banner"
      style={{
        height: "var(--header-height)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        backgroundColor: "hsl(var(--background) / 0.8)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid hsl(var(--border))",
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button
          onClick={onMenuClick}
          className="show-on-mobile"
          style={{
            background: "transparent",
            border: "none",
            fontSize: "20px",
            color: "var(--primary)",
            cursor: "pointer",
            padding: "8px",
          }}
        >
          <FaBars />
        </button>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h2
            className="text-h2"
            style={{
              color: "var(--primary)",
              margin: 0,
              fontSize: "clamp(16px, 4vw, 24px)",
            }}
          >
            {title || "My Drive"}
          </h2>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        {showSearch && (
          <div className="header-search flex items-center bg-secondary rounded-[16px] px-4 w-[clamp(200px,30vw,400px)] border border-transparent transition-all focus-within:bg-background focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(27,55,100,0.05)]">
            <FaSearch
              aria-hidden="true"
              color="#94a3b8"
              size={14}
              className="shrink-0"
            />
            <Input
              type="text"
              aria-label="Search files, folders, and shared items"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none bg-transparent focus-visible:ring-0 shadow-none font-medium text-[14px] text-foreground"
            />
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <ModeToggle />

          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="hide-on-mobile h-10 w-10 text-slate-500 rounded-xl relative hover:bg-slate-100"
          >
            <FaBell size={18} />
            <span
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                width: "8px",
                height: "8px",
                background: "#f43f5e",
                borderRadius: "50%",
                border: "2px solid #fff",
              }}
            />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Settings"
            className="hide-on-mobile h-10 w-10 text-slate-500 rounded-xl hover:bg-slate-100"
          >
            <FaCog size={18} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "4px 8px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                className="hover:bg-slate-50"
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "var(--primary-hex)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "14px",
                    boxShadow: "0 4px 10px rgba(27, 55, 100, 0.2)",
                  }}
                >
                  CU
                </div>
                <div
                  className="hide-on-mobile"
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    Cloud User
                  </span>
                  <FaChevronDown size={10} color="#94a3b8" />
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 p-2 rounded-[20px]"
            >
              <DropdownMenuLabel className="px-3 py-3 border-b border-slate-50 mb-1">
                <div
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    color: "#94a3b8",
                    letterSpacing: "0.05em",
                  }}
                >
                  Signed in as
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  clouduser@example.com
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem className="py-3">
                <FaUser className="text-[#94a3b8]" />
                <span>My Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="py-3">
                <FaCloud className="text-[#94a3b8]" />
                <span>Storage Details</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="py-3">
                <FaCog className="text-[#94a3b8]" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-slate-50" />
              <DropdownMenuItem className="py-3 text-red-600 focus:text-red-600 focus:bg-red-50">
                <FaSignOutAlt className="opacity-70" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
