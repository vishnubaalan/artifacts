import { useState, useEffect } from "react";
import {
  FaPlus,
  FaHdd,
  FaUsers,
  FaClock,
  FaTrash,
  FaCloud,
  FaChartPie,
  FaCog,
  FaStar,
  FaFolderPlus,
  FaFileUpload,
  FaFolderOpen,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { api } from "../../services/api";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";

const Sidebar = ({ onUploadClick, refreshTrigger, isOpen }) => {
  const [storage, setStorage] = useState({
    totalBytes: 0,
    quotaBytes: 1024 * 1024 * 1024,
  });

  useEffect(() => {
    fetchStorageUsage();
  }, [refreshTrigger]);

  const fetchStorageUsage = async () => {
    try {
      const response = await api.get("/api/s3/storage-usage");
      setStorage(response.data.data);
    } catch (error) {
      console.error("Failed to fetch storage usage:", error);
    }
  };

  const formatBytes = (bytes, decimals = 1) => {
    if (!+bytes) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const usedPercentage = Math.min(
    Math.round((storage.totalBytes / storage.quotaBytes) * 100),
    100
  );

  return (
    <aside
      className={`sidebar-container ${isOpen ? "open" : ""}`}
      role="complementary"
      aria-label="Main Navigation Sidebar"
      style={{
        width: "var(--sidebar-width)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "transparent",
        color: "#ffffff",
        height: "100%",
      }}
    >
      <div
        style={{
          marginBottom: "40px",
          paddingLeft: "8px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: "40px",
            height: "40px",
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(8px)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
          }}
        >
          <FaCloud style={{ color: "#ffffff", fontSize: "22px" }} />
        </div>
        <div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 800,
              letterSpacing: "-0.5px",
              color: "#fff",
              margin: 0,
            }}
          >
            Artifacts
          </h1>
          <span
            style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.5)",
              fontWeight: 500,
            }}
          >
            S3 Cloud Drive
          </span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-3 py-6 mb-10 bg-white text-[#1b3764] rounded-[14px] border-none font-semibold text-[15px] hover:bg-white hover:text-[#1b3764] transition-none"
            aria-label="Upload New Artifact"
          >
            <FaPlus aria-hidden="true" size={14} />
            <span>Upload New</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="start"
          className="w-56 ml-2 rounded-[20px]"
        >
          <DropdownMenuItem
            onClick={() => onUploadClick("folder_new")}
            className="py-3"
          >
            <FaFolderPlus className="text-blue-500" />
            <span>New Folder</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-50" />
          <DropdownMenuItem
            onClick={() => onUploadClick("file")}
            className="py-3"
          >
            <FaFileUpload className="text-orange-500" />
            <span>File Upload</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUploadClick("folder")}
            className="py-3"
          >
            <FaFolderOpen className="text-yellow-500" />
            <span>Folder Upload</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div
        id="sidebar-nav-label"
        style={{
          marginBottom: "16px",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "1.5px",
          color: "rgba(255,255,255,0.4)",
          fontWeight: 700,
          paddingLeft: "12px",
        }}
      >
        Personal
      </div>

      <nav
        aria-labelledby="sidebar-nav-label"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <NavItem
          to="/"
          icon={<FaChartPie aria-hidden="true" />}
          label="Dashboard"
        />
        <NavItem
          to="/drive"
          icon={<FaHdd aria-hidden="true" />}
          label="My Drive"
        />
        <NavItem
          to="/recent"
          icon={<FaClock aria-hidden="true" />}
          label="Recent"
        />
        <NavItem
          to="/starred"
          icon={<FaStar aria-hidden="true" />}
          label="Starred"
        />
        <NavItem
          to="/shared"
          icon={<FaUsers aria-hidden="true" />}
          label="Shared"
        />
        <NavItem
          to="/trash"
          icon={<FaTrash aria-hidden="true" />}
          label="Trash"
        />
      </nav>

      <section
        aria-label="Storage Usage"
        style={{
          marginTop: "auto",
          backgroundColor: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          padding: "20px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
            }}
          >
            <FaCloud aria-hidden="true" style={{ opacity: 0.7 }} />
            <span>Storage</span>
          </div>
          <span
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.5)",
              fontWeight: 600,
            }}
          >
            {usedPercentage}% Used
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={usedPercentage}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label={`${usedPercentage}% of storage used`}
          style={{
            width: "100%",
            height: "8px",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: "4px",
            marginBottom: "12px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${usedPercentage}%`,
              height: "100%",
              background:
                "linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)",
              borderRadius: "4px",
              boxShadow: "0 0 10px rgba(255,255,255,0.3)",
              transition: "width 0.5s ease-in-out",
            }}
          ></div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "rgba(255,255,255,0.6)",
            fontWeight: 500,
          }}
        >
          <span aria-label={`Used: ${formatBytes(storage.totalBytes)}`}>
            {formatBytes(storage.totalBytes)}
          </span>
          <span aria-label={`Total: ${formatBytes(storage.quotaBytes)}`}>
            {formatBytes(storage.quotaBytes)}
          </span>
        </div>
      </section>
    </aside>
  );
};

const NavItem = ({ to, icon, label }) => (
  <NavLink to={to} style={{ textDecoration: "none" }}>
    {({ isActive }) => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 16px",
          color: isActive ? "#ffffff" : "rgba(255,255,255,0.6)",
          backgroundColor: isActive
            ? "rgba(255, 255, 255, 0.12)"
            : "transparent",
          borderRadius: "14px",
          fontSize: "14px",
          fontWeight: isActive ? "600" : "500",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          // borderLeft: isActive ? "4px solid #ffffff" : "4px solid transparent",
          boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.05)" : "none",
        }}
        onMouseOver={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
            e.currentTarget.style.color = "#ffffff";
          }
        }}
        onMouseOut={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.6)";
          }
        }}
      >
        <span
          style={{ fontSize: "18px", display: "flex", alignItems: "center" }}
        >
          {icon}
        </span>
        <span>{label}</span>
      </div>
    )}
  </NavLink>
);

export default Sidebar;
