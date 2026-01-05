import { useState, useEffect } from "react";
import {
  FaCloudUploadAlt,
  FaFolder,
  FaFileAlt,
  FaHdd,
  FaHistory,
  FaArrowUp,
  FaArrowDown,
  FaUsers,
  FaTrash,
} from "react-icons/fa";
import { format } from "date-fns";
import { api } from "../services/api";

import { useNavigate } from "react-router-dom";
import { encodeId } from "../utils/idMapping";

const Dashboard = ({ refreshTrigger }) => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    stats: {
      totalFiles: 0,
      totalFolders: 0,
      storageUsed: 0,
      storageQuota: 1024 * 1024 * 1024,
      usedPercentage: 0,
    },
    breakdown: [],
    activities: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/dashboard/stats");
      if (response.data && response.data.success && response.data.data) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <div className="spinner" aria-label="Loading dashboard data"></div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: "clamp(12px, 3vw, 24px)" }}>
      <header style={{ marginBottom: "24px" }}>
        <h1
          className="text-h1"
          style={{
            color: "var(--primary)",
            marginBottom: "4px",
            fontSize: "clamp(24px, 5vw, 32px)",
          }}
        >
          Activity
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          Monitor your real-time S3 storage analytics and activities.
        </p>
      </header>

      {/* Stats Grid */}
      <div
        className="stat-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <StatCard
          icon={<FaHdd color="#3b82f6" />}
          title="Bucket Content"
          value={`${data.stats.totalFiles} Files`}
          subtitle={`${data.stats.totalFolders} Folders identified`}
        />
        <StatCard
          icon={<FaCloudUploadAlt color="#8b5cf6" />}
          title="Storage Used"
          value={formatBytes(data.stats.storageUsed)}
          subtitle={`${data.stats.usedPercentage}% of ${formatBytes(
            data.stats.storageQuota
          )}`}
          progress={data.stats.usedPercentage}
        />
        <StatCard
          icon={<FaUsers color="#ec4899" />}
          title="Bucket Access"
          value="Standard"
          subtitle="Direct S3 Integration"
        />
        <StatCard
          icon={<FaHistory color="#f59e0b" />}
          title="Cloud Status"
          value="Active"
          subtitle="S3 Storage Live"
        />
      </div>

      <div
        className="dashboard-layout"
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}
      >
        {/* Recent Activity Section */}
        <section
          className="no-scrollbar"
          style={{
            background: "var(--background)",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            border: "1px solid var(--border)",
            overflowY: "auto",
            maxHeight: "395px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--primary)",
                margin: 0,
              }}
            >
              Recent Activity
            </h3>
            <button
              onClick={() => navigate("/recent")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--primary)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              View All
            </button>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {!data?.activities || data.activities.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "var(--text-muted)",
                }}
              >
                No recent activity found in S3 bucket.
              </div>
            ) : (
              data.activities.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => {
                    if (!activity?.id) return;
                    const parts = activity.id.split("/");
                    parts.pop(); // remove file name
                    const folderPath = parts.join("/");
                    navigate(
                      folderPath ? `/drive/${encodeId(folderPath)}` : "/drive"
                    );
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "12px",
                    borderRadius: "16px",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--secondary)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      backgroundColor:
                        activity.type === "upload"
                          ? "rgba(22, 163, 74, 0.15)"
                          : activity.type === "delete"
                          ? "rgba(239, 68, 68, 0.15)"
                          : "var(--secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color:
                        activity.type === "upload"
                          ? "#16a34a"
                          : activity.type === "delete"
                          ? "#ef4444"
                          : "var(--text-muted)",
                    }}
                  >
                    {activity.type === "delete" ? (
                      <FaTrash />
                    ) : (
                      getFileIcon(activity.fileName)
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                      }}
                    >
                      {activity.userName}{" "}
                      <span
                        style={{ fontWeight: 400, color: "var(--text-muted)" }}
                      >
                        modified
                      </span>{" "}
                      {activity.fileName}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        marginTop: "2px",
                      }}
                    >
                      {activity.timestamp
                        ? (() => {
                            try {
                              return format(
                                new Date(activity.timestamp),
                                "MMM d, h:mm a"
                              );
                            } catch (e) {
                              return "Recent";
                            }
                          })()
                        : "Just now"}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color:
                        activity.type === "upload"
                          ? "#16a34a"
                          : activity.type === "delete"
                          ? "#ef4444"
                          : "var(--text-muted)",
                      backgroundColor:
                        activity.type === "upload"
                          ? "rgba(22, 163, 74, 0.15)"
                          : activity.type === "delete"
                          ? "rgba(239, 68, 68, 0.15)"
                          : "var(--secondary)",
                      padding: "4px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {activity.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick Actions / Tips */}
        <section
          style={{ display: "flex", flexDirection: "column", gap: "24px" }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg, var(--primary) 0%, #334155 100%)",
              backgroundColor: "var(--primary-hex)",
              borderRadius: "24px",
              padding: "24px",
              color: "#fff",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            }}
          >
            <h4
              style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 700 }}
            >
              Pro Tip
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: "1.6",
                opacity: 0.9,
              }}
            >
              Did you know? Large files are now uploaded directly to S3 via
              presigned URLs for maximum speed and security!
            </p>
          </div>

          <div
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            }}
          >
            <h4
              style={{
                margin: "0 0 16px 0",
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--primary)",
              }}
            >
              Storage Breakdown
            </h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {data.breakdown && data.breakdown.length > 0 ? (
                data.breakdown.map((item, idx) => (
                  <StorageItem
                    key={idx}
                    label={item.label}
                    percent={item.percent}
                    color={item.color}
                  />
                ))
              ) : (
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Calculating breakdown...
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, subtitle, progress }) => (
  <div
    style={{
      background: "var(--card-foreground)",
      borderRadius: "24px",
      padding: "24px",
      boxShadow: "rgba(59, 67, 60, 12.05) -2px 0px 16px 0px",
      border: "1px solid var(--border)",
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          backgroundColor: "var(--secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-muted)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "var(--primary)",
            marginTop: "2px",
          }}
        >
          {value}
        </div>
      </div>
    </div>
    <div
      style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}
    >
      {subtitle}
    </div>
    {progress !== undefined && (
      <div
        style={{
          width: "100%",
          height: "4px",
          backgroundColor: "var(--secondary)",
          borderRadius: "2px",
          marginTop: "12px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            backgroundColor: "#8b5cf6",
          }}
        ></div>
      </div>
    )}
  </div>
);

const StorageItem = ({ label, percent, color }) => (
  <div>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "12px",
        marginBottom: "6px",
      }}
    >
      <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
        {percent}%
      </span>
    </div>
    <div
      style={{
        width: "100%",
        height: "6px",
        backgroundColor: "var(--secondary)",
        borderRadius: "3px",
        overflow: "hidden",
      }}
    >
      <div
        style={{ width: `${percent}%`, height: "100%", backgroundColor: color }}
      ></div>
    </div>
  </div>
);

const getFileIcon = (fileName) => {
  const ext = fileName?.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "svg"].includes(ext)) return <FaFileAlt />;
  if (["pdf", "doc", "docx"].includes(ext)) return <FaFileAlt />;
  return <FaFileAlt />;
};

export default Dashboard;
