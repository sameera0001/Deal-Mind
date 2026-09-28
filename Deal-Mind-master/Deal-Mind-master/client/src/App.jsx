import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const API =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5000";

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed: ${response.status}`
    );
  }

  return data;
}

async function get(path) {
  return api(path);
}

async function post(path, body) {
  return api(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function arr(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}
function displayText(value) {
  if (value === null || value === undefined) return "";

  if (typeof value === "object") {
    return (
      value.text ||
      value.why_it_matters ||
      value.suggested_response ||
      JSON.stringify(value)
    );
  }

  return String(value);
}

function money(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(number);
}

function nice(value) {
  if (!value) return "—";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateText(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function byDate(items = []) {
  return [...items].sort((a, b) => {
    return (
      new Date(b?.date || b?.created_at || 0) -
      new Date(a?.date || a?.created_at || 0)
    );
  });
}

function getDeals(data) {
  if (Array.isArray(data)) return data;
  return data?.deals || data?.items || data?.data || [];
}

function getDealId(deal) {
  return deal?.id || deal?._id || deal?.deal_id;
}

function getDealName(deal) {
  return (
    deal?.company_name ||
    deal?.company ||
    deal?.name ||
    deal?.account_name ||
    "Unnamed Deal"
  );
}

function getContact(deal) {
  return (
    deal?.contact_name ||
    deal?.contact ||
    deal?.primary_contact ||
    "No contact"
  );
}

function getCalls(deal) {
  return arr(
    deal?.calls ||
    deal?.call_history ||
    deal?.conversations ||
    deal?.deal?.calls ||
    deal?.deal?.call_history ||
    deal?.deal?.conversations
  );
}

async function getDealDetails(dealId) {
  const data = await get(`/api/deals/${dealId}`);
  const actualDeal = data?.deal || data?.data || data;

  return {
    deal: {
      ...actualDeal,
      calls: data?.calls || actualDeal?.calls || [],
    },
    facts:
      data?.facts ||
      actualDeal?.facts ||
      data?.memory ||
      actualDeal?.memory ||
      {},
  };
}

async function getDealBrief(dealId) {
  const data = await get(`/api/deals/${dealId}/brief`);
  return data?.brief || data?.data || data;
}

/* ---------------- ICONS ---------------- */

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const paths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    brain: (
      <>
        <path d="M9.5 3.5a3.5 3.5 0 0 0-3.2 5A4 4 0 0 0 7 16a3.5 3.5 0 0 0 6 2.4V5.2a3.5 3.5 0 0 0-3.5-1.7Z" />
        <path d="M14.5 3.5a3.5 3.5 0 0 1 3.2 5A4 4 0 0 1 17 16a3.5 3.5 0 0 1-6 2.4V5.2a3.5 3.5 0 0 1 3.5-1.7Z" />
        <path d="M9 8h2M13 8h2M9 13h2M13 13h2" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
        <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    trend: (
      <>
        <path d="M3 17l6-6 4 4 8-9" />
        <path d="M15 6h6v6" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M16 14a5 5 0 0 1 5 5" />
      </>
    ),
    dollar: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15 8.5c-.7-.7-1.6-1-3-1-1.7 0-3 1-3 2.3 0 3.4 6 1.5 6 4.5 0 1.4-1.3 2.4-3.2 2.4-1.4 0-2.5-.4-3.3-1.2" />
        <path d="M12 5v14" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 4.3 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-2.5v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5v-2.5h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L8 6.7l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.5v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v2.5h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </>
    ),
    chevron: (
      <>
        <path d="m7 10 5 5 5-5" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    phone: (
      <>
        <path d="M6.6 3.2 9 8l-2.2 2.2a15 15 0 0 0 6.9 6.9L16 14.9l4.8 2.4-1.2 3.2a2 2 0 0 1-2.1 1.2C9.9 20.7 3.3 14.1 2.3 6.5A2 2 0 0 1 3.5 4.4l3.1-1.2Z" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" />
        <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.spark}</svg>;
}

/* ---------------- UI ---------------- */

function Badge({ children, tone = "purple" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Button({
  children,
  onClick,
  variant = "primary",
  icon,
  disabled = false,
  type = "button",
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

function Card({ children, className = "" }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function Loading({ text = "Loading DealMind..." }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <span>{displayText(text)}</span>
    </div>
  );
}

function ErrorBox({ error }) {
  if (!error) return null;

  return (
    <div className="error-box">
      <div className="error-icon">!</div>
      <div>
        <strong>Something went wrong</strong>
        <p>{error}</p>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-eyebrow">DEALMIND</div>
            <h2>{title}</h2>
          </div>

          <button className="icon-button" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* ---------------- SHELL ---------------- */

function Shell({ page, setPage, children, onNewDeal, searchQuery, onSearchChange }) {
  const nav = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "dashboard",
    },
    {
      id: "demo",
      label: "Memory Demo",
      icon: "brain",
    },
    {
      id: "playbook",
      label: "Playbook",
      icon: "book",
    },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Icon name="spark" size={20} />
          </div>

          <div>
            <div className="brand-name">DealMind</div>
            <div className="brand-tag">Deal intelligence, remembered.</div>
          </div>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`sidebar-link ${
                page === item.id ? "active" : ""
              }`}
              onClick={() => setPage(item.id)}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="memory-status">
            <div className="status-icon">
              <Icon name="brain" size={18} />
            </div>

            <div>
              <div className="status-title">Hindsight Memory</div>
              <div className="status-line">
                <span className="status-dot" />
                Connected & learning
              </div>
            </div>
          </div>

          <button className="sidebar-settings">
            <Icon name="settings" size={17} />
            Settings
          </button>

          <div className="user-card">
            <div className="avatar">JE</div>
            <div>
              <strong>Jordan Ellis</strong>
              <span>Sales Manager</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{nice(page)}</strong>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Icon name="search" size={17} />
              <input
                aria-label="Search deals by company or contact"
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
              />
              <span className="search-shortcut">⌘ K</span>
            </div>

            <button className="top-icon">
              <Icon name="calendar" size={18} />
            </button>

            <div className="top-avatar">JE</div>
          </div>
        </header>

        <div className="page-content">{children}</div>
      </main>

      {onNewDeal && (
        <button className="floating-create" onClick={onNewDeal}>
          <Icon name="plus" size={18} />
          New Deal
        </button>
      )}
    </div>
  );
}

/* ---------------- DASHBOARD ---------------- */

function Dashboard({ onOpenDeal, onNewDeal, searchQuery }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllDeals, setShowAllDeals] = useState(false);

  useEffect(() => {
    let current = true;

    async function load() {
      try {
        const data = await get("/api/deals");
        if (current) setDeals(getDeals(data));
      } catch (err) {
        if (current) setError(err.message);
      } finally {
        if (current) setLoading(false);
      }
    }

    load();
    return () => {
      current = false;
    };
  }, []);

  const pipeline = useMemo(
    () =>
      deals.reduce(
        (sum, deal) =>
          sum +
          Number(
            deal?.value ??
              deal?.deal_value ??
              deal?.amount ??
              deal?.price ??
              0
          ),
        0
      ),
    [deals]
  );

  const calls = useMemo(
    () => deals.reduce((sum, deal) => sum + getCalls(deal).length, 0),
    [deals]
  );

  const stages = useMemo(() => {
    const map = {};

    deals.forEach((deal) => {
      const stage = nice(
        deal?.stage || deal?.status || deal?.pipeline_stage || "Unknown"
      );

      map[stage] = (map[stage] || 0) + 1;
    });

    return map;
  }, [deals]);

  const recentDeals = useMemo(
    () =>
      [...deals]
        .sort(
          (a, b) =>
            new Date(
              b?.updated_at ||
                b?.last_activity ||
                b?.last_activity_at ||
                0
            ) -
            new Date(
              a?.updated_at ||
                a?.last_activity ||
                a?.last_activity_at ||
                0
            )
        ),
    [deals]
  );

  const matchingDeals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return recentDeals;

    return recentDeals.filter((deal) =>
      `${getDealName(deal)} ${getContact(deal)}`
        .toLowerCase()
        .includes(query)
    );
  }, [recentDeals, searchQuery]);

  const visibleDeals =
    showAllDeals || searchQuery.trim()
      ? matchingDeals
      : matchingDeals.slice(0, 5);

  return (
    <div className="dashboard-page">
      <div className="page-hero">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            AI DEAL INTELLIGENCE
          </div>

          <h1>Your deals, remembered.</h1>

          <p>
            DealMind combines your CRM activity with persistent memory to
            help you prepare, prioritize and act on every deal.
          </p>
        </div>

        <Button icon="plus" onClick={onNewDeal}>
          New Deal
        </Button>
      </div>

      <ErrorBox error={error} />

      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="metric-grid">
            <MetricCard
              icon="dashboard"
              label="Active Deals"
              value={deals.length}
              detail="Across your current pipeline"
              tone="purple"
            />

            <MetricCard
              icon="dollar"
              label="Total Pipeline"
              value={money(pipeline)}
              detail="Combined deal value"
              tone="blue"
            />

            <MetricCard
              icon="phone"
              label="Conversations"
              value={calls}
              detail="Calls feeding DealMind memory"
              tone="green"
            />

            <MetricCard
              icon="brain"
              label="Memory Status"
              value="Live"
              detail="Hindsight connected"
              tone="pink"
              live
            />
          </div>

          <div className="section-heading-row">
            <div>
              <div className="section-kicker">PIPELINE OVERVIEW</div>
              <h2>Your active opportunities</h2>
            </div>

            <div className="pipeline-summary">
              {Object.entries(stages).map(([stage, count]) => (
                <span key={stage}>
                  <b>{count}</b> {stage}
                </span>
              ))}
            </div>
          </div>

          <div className="dashboard-main-grid">
            <Card className="pipeline-card">
              <div className="card-heading">
                <div>
                  <h3>Deal pipeline</h3>
                  <p>Click any opportunity to open its intelligence.</p>
                </div>

                <button
                  className="view-link"
                  aria-expanded={showAllDeals}
                  onClick={() => setShowAllDeals((value) => !value)}
                >
                  {showAllDeals ? "Show recent" : "View all"}
                  <Icon name="arrow" size={15} />
                </button>
              </div>

              {deals.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Icon name="briefcase" size={25} />
                  </div>
                  <h3>No deals yet</h3>
                  <p>Create your first deal to start building memory.</p>
                </div>
              ) : visibleDeals.length === 0 ? (
                <div className="empty-state">
                  <h3>No matching deals</h3>
                  <p>Try a different company or contact name.</p>
                </div>
              ) : (
                <div className="deal-list">
                  <div className="deal-list-head" aria-hidden="true">
                    <span />
                    <span>Account</span>
                    <span>Stage</span>
                    <span>Value</span>
                    <span>Last activity</span>
                    <span />
                  </div>
                  {visibleDeals.map((deal) => (
                    <DealRow
                      key={getDealId(deal)}
                      deal={deal}
                      onClick={() => onOpenDeal(getDealId(deal))}
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card className="insight-card">
              <div className="insight-header">
                <div className="ai-orb">
                  <Icon name="brain" size={22} />
                </div>

                <div>
                  <div className="section-kicker">DEALMIND INTELLIGENCE</div>
                  <h3>Memory is your advantage.</h3>
                </div>
              </div>

              <p className="insight-copy">
                DealMind remembers objections, stakeholders, competitors,
                commitments and what worked across every conversation.
              </p>

              <div className="insight-feature">
                <div className="feature-number">01</div>
                <div>
                  <strong>Remember</strong>
                  <span>Capture important deal context.</span>
                </div>
              </div>

              <div className="insight-feature">
                <div className="feature-number">02</div>
                <div>
                  <strong>Connect</strong>
                  <span>Combine old and new conversations.</span>
                </div>
              </div>

              <div className="insight-feature">
                <div className="feature-number">03</div>
                <div>
                  <strong>Recommend</strong>
                  <span>Turn memory into the next action.</span>
                </div>
              </div>

              <button
                className="intelligence-button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("deal-mind-demo")
                  );
                }}
              >
                <Icon name="spark" size={16} />
                See Memory in Action
                <Icon name="arrow" size={15} />
              </button>
            </Card>
          </div>

          <Card className="activity-card">
            <div className="card-heading">
              <div>
                <div className="section-kicker">RECENT ACTIVITY</div>
                <h3>Latest deal movement</h3>
              </div>
            </div>

            <div className="activity-grid">
              {recentDeals.slice(0, 4).map((deal) => (
                <div className="activity-item" key={getDealId(deal)}>
                  <div className="activity-icon">
                    <Icon name="trend" size={17} />
                  </div>

                  <div>
                    <strong>{getDealName(deal)}</strong>
                    <span>
                      Last activity{" "}
                      {dateText(
                        deal?.last_activity ||
                          deal?.updated_at ||
                          deal?.updatedAt
                      )}
                    </span>
                  </div>

                  <Badge tone="green">
                    {nice(
                      deal?.stage ||
                        deal?.status ||
                        deal?.pipeline_stage ||
                        "Active"
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone = "purple",
  live = false,
}) {
  return (
    <div className={`metric-card metric-${tone}`}>
      <div className="metric-top">
        <div className="metric-icon">
          <Icon name={icon} size={19} />
        </div>

        {live && (
          <span className="live-pill">
            <span />
            Live
          </span>
        )}
      </div>

      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </div>
  );
}

function DealRow({ deal, onClick }) {
  const value =
    deal?.value ??
    deal?.deal_value ??
    deal?.amount ??
    deal?.price ??
    0;

  const calls = getCalls(deal);

  return (
    <button className="deal-row" onClick={onClick}>
      <div className="company-avatar">
        {getDealName(deal).slice(0, 2).toUpperCase()}
      </div>

      <div className="deal-main">
        <div className="deal-company">{getDealName(deal)}</div>
        <div className="deal-contact">{getContact(deal)}</div>
      </div>

      <div className="deal-stage">
        <Badge>
          {nice(
            deal?.stage ||
              deal?.status ||
              deal?.pipeline_stage ||
              "Active"
          )}
        </Badge>
      </div>

      <div className="deal-value">
        <strong>{money(value)}</strong>
        <span>{calls.length} conversations</span>
      </div>

      <div className="deal-date">
        <span>Last activity</span>
        <strong>
          {dateText(
            deal?.last_activity ||
              deal?.updated_at ||
              deal?.updatedAt
          )}
        </strong>
      </div>

      <div className="deal-arrow">
        <Icon name="arrow" size={18} />
      </div>
    </button>
  );
}

/* ---------------- DEAL DETAIL ---------------- */

function DealDetail({ dealId, onBack }) {
  const [deal, setDeal] = useState(null);
  const [brief, setBrief] = useState(null);
  const [facts, setFacts] = useState({});
  const [loading, setLoading] = useState(true);
  const [briefLoading, setBriefLoading] = useState(false);
  const [error, setError] = useState("");
  const [ask, setAsk] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  async function loadDeal() {
    try {
      const result = await getDealDetails(dealId);
      setDeal(result.deal);
      setFacts(result.facts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadBrief(showLoading = false) {
    if (showLoading) setBriefLoading(true);

    try {
      setBrief(await getDealBrief(dealId));
    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoading) setBriefLoading(false);
    }
  }

  useEffect(() => {
    let current = true;

    getDealDetails(dealId)
      .then((result) => {
        if (current) {
          setDeal(result.deal);
          setFacts(result.facts);
        }
      })
      .catch((err) => {
        if (current) setError(err.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    getDealBrief(dealId)
      .then((result) => {
        if (current) setBrief(result);
      })
      .catch((err) => {
        if (current) setError(err.message);
      });

    return () => {
      current = false;
    };
  }, [dealId]);

  async function askDealMind() {
    if (!ask.trim()) return;

    setAsking(true);
    setAnswer("");

    try {
      const data = await post(`/api/deals/${dealId}/ask`, {
        question: ask,
      });

      setAnswer(
        data?.answer ||
          data?.response ||
          data?.message ||
          "DealMind did not return an answer."
      );
    } catch (err) {
      setAnswer(`Error: ${err.message}`);
    } finally {
      setAsking(false);
    }
  }

  if (loading) {
    return <Loading text="Loading deal intelligence..." />;
  }

  if (!deal) {
    return (
      <div>
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <ErrorBox error={error || "Deal not found."} />
      </div>
    );
  }

  const name = getDealName(deal);
  const value =
    deal?.value ??
    deal?.deal_value ??
    deal?.amount ??
    deal?.price ??
    0;

  const calls = byDate(getCalls(deal));

  return (
    <div className="detail-page">
      <button className="back-link" onClick={onBack}>
        ← Back to pipeline
      </button>

      <ErrorBox error={error} />

      <div className="deal-hero">
        <div className="deal-hero-left">
          <div className="large-company-avatar">
            {name.slice(0, 2).toUpperCase()}
          </div>

          <div>
            <div className="eyebrow">
              {nice(
                deal?.stage ||
                  deal?.status ||
                  deal?.pipeline_stage ||
                  "ACTIVE DEAL"
              )}
            </div>

            <h1>{name}</h1>

            <p>
              {getContact(deal)} · Deal intelligence powered by
              persistent memory
            </p>
          </div>
        </div>

        <div className="deal-hero-value">
          <span>Deal value</span>
          <strong>{money(value)}</strong>
        </div>
      </div>

      <div className="detail-stat-grid">
        <DetailStat
          label="Conversations"
          value={calls.length}
          icon="phone"
        />
        <DetailStat
          label="Memory signals"
          value={
            brief?.memory?.count ||
            brief?.memory?.memories_count ||
            arr(brief?.memory?.facts_considered).length ||
            "—"
          }
          icon="brain"
        />
        <DetailStat
          label="Open objections"
          value={arr(brief?.open_objections).length || "—"}
          icon="alert"
        />
        <DetailStat
          label="Deal stage"
          value={nice(
            deal?.stage ||
              deal?.status ||
              deal?.pipeline_stage ||
              "Active"
          )}
          icon="target"
        />
      </div>

      <div className="detail-grid">
        <div className="detail-primary">
          <Card>
            <div className="card-heading">
              <div>
                <div className="section-kicker">CONVERSATION HISTORY</div>
                <h3>Call timeline</h3>
              </div>

              <Button
                variant="secondary"
                icon="plus"
                onClick={() => setShowCall(true)}
              >
                Log Call
              </Button>
            </div>

            <div className="timeline">
              {calls.length === 0 ? (
                <div className="empty-small">
                  No calls recorded yet.
                </div>
              ) : (
                calls.map((call, index) => (
                  <TimelineItem
                    key={call?.id || call?._id || index}
                    call={call}
                    index={index}
                  />
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="card-heading">
              <div>
                <div className="section-kicker">ASK DEALMIND</div>
                <h3>Ask about this deal</h3>
              </div>

              <div className="ai-badge">
                <Icon name="brain" size={14} />
                Hindsight
              </div>
            </div>

            <p className="muted">
              Ask DealMind to recall anything from this deal's history.
            </p>

            <div className="ask-box">
              <input
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") askDealMind();
                }}
                placeholder="e.g. What is the biggest risk before our next call?"
              />

              <button onClick={askDealMind} disabled={asking}>
                <Icon name="send" size={17} />
              </button>
            </div>

            {answer && (
              <div className="answer-box">
                <div className="answer-label">
                  <Icon name="spark" size={15} />
                  DealMind
                </div>
                <p>{answer}</p>
              </div>
            )}
          </Card>
        </div>

        <aside className="detail-sidebar">
          <Card className="brief-card">
            <div className="brief-top">
              <div className="ai-orb small">
                <Icon name="spark" size={18} />
              </div>

              <div>
                <div className="section-kicker">PRE-CALL INTELLIGENCE</div>
                <h3>Prepare me</h3>
              </div>
            </div>

            <p>
              Get a memory-powered briefing before your next
              conversation.
            </p>

            <Button
              icon="spark"
              onClick={() => loadBrief(true)}
              disabled={briefLoading}
            >
              {briefLoading ? "Preparing..." : "Refresh brief"}
            </Button>
          </Card>

          {brief && (
            <MemoryStrategy brief={brief} facts={facts} />
          )}
        </aside>
      </div>
{brief && (
  <PreCallBrief
    brief={brief}
    onToggleRaw={() => setShowRaw((v) => !v)}
    showRaw={showRaw}
  />
)}

{brief && (
  <MemoryLearned
    brief={brief}
    facts={facts}
    calls={calls}
  />
)}

{showCall && (
        <LogCallModal
          dealId={dealId}
          onClose={() => setShowCall(false)}
          onSaved={() => {
            setShowCall(false);
            loadDeal();
            loadBrief();
          }}
        />
      )}
    </div>
  );
}

function DetailStat({ label, value, icon }) {
  return (
    <div className="detail-stat">
      <div className="detail-stat-icon">
        <Icon name={icon} size={18} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function TimelineItem({ call, index }) {
  const tone =
    String(call?.sentiment || call?.outcome || "").toLowerCase();

  return (
    <div className="timeline-item">
      <div className="timeline-marker">
        <span>{index + 1}</span>
      </div>

      <div className="timeline-content">
        <div className="timeline-top">
          <strong>
            {call?.title ||
              call?.summary_title ||
              `Call ${index + 1}`}
          </strong>

          <span>
            {dateText(
              call?.date ||
                call?.created_at ||
                call?.timestamp
            )}
          </span>
        </div>

        <p>
          {call?.summary ||
            call?.transcript ||
            call?.notes ||
            "Conversation recorded in DealMind memory."}
        </p>

        {tone && (
          <Badge
            tone={
              tone.includes("positive")
                ? "green"
                : tone.includes("negative")
                ? "red"
                : "yellow"
            }
          >
            {nice(tone)}
          </Badge>
        )}
      </div>
    </div>
  );
}

/* ---------------- MEMORY STRATEGY ---------------- */

function MemoryStrategy({ brief, facts }) {
  const objections = arr(brief?.open_objections);
  const risks = arr(brief?.risks);
  const talkingPoints = arr(brief?.suggested_talking_points);
  const stakeholders = arr(
    facts?.stakeholders || brief?.stakeholders
  );
  const competitors = arr(
    facts?.competitors || brief?.competitors
  );

  const considered =
    arr(brief?.memory?.facts_considered).length ||
    Number(brief?.memory?.count || 0);

  const nextStep =
    brief?.next_step ||
    brief?.recommended_next_step ||
    "Review the remembered context and prepare the next customer conversation.";

  return (
    <Card className="strategy-card">
      <div className="strategy-header">
        <div className="strategy-icon">
          <Icon name="spark" size={20} />
        </div>

        <div>
          <div className="section-kicker">MEMORY → STRATEGY</div>
          <h3>Recommended next move</h3>
        </div>
      </div>

      <div className="strategy-main">
        {nextStep}
      </div>

      <div className="strategy-divider" />

      <div className="strategy-section-title">
        Why DealMind recommends this
      </div>

      {objections[0] && (
        <StrategySignal
          icon="alert"
          title="Address the known objection"
          text={objections[0]}
          tone="red"
        />
      )}

      {competitors[0] && (
        <StrategySignal
          icon="target"
          title="Prepare for competitive pressure"
          text={competitors[0]}
          tone="purple"
        />
      )}

      {stakeholders[0] && (
        <StrategySignal
          icon="users"
          title="Keep key stakeholders in mind"
          text={displayText(stakeholders[0])}
          tone="blue"
        />
      )}

      {talkingPoints[0] && (
        <StrategySignal
          icon="spark"
          title="Use the learned talking point"
          text={talkingPoints[0]}
          tone="green"
        />
      )}

      <div className="strategy-footer">
        <span>
          <b>{considered || "Live"}</b> memories used
        </span>

        <span>
          <b>{objections.length}</b> objections
        </span>

        <span>
          <b>{competitors.length}</b> competitor signals
        </span>
      </div>

      {risks.length > 0 && (
        <div className="risk-mini">
          <div className="risk-mini-title">
            <Icon name="alert" size={14} />
            Risk to watch
          </div>

          <span>{risks[0]}</span>
        </div>
      )}
    </Card>
  );
}

function StrategySignal({ icon, title, text, tone }) {
  return (
    <div className={`strategy-signal signal-${tone}`}>
      <div className="signal-icon">
        <Icon name={icon} size={15} />
      </div>

      <div>
        <strong>{title}</strong>
        <span>{displayText(text)}</span>
      </div>
    </div>
  );
}

/* ---------------- PRE CALL ---------------- */

function PreCallBrief({ brief, onToggleRaw, showRaw }) {
  const objections = arr(brief?.open_objections);
  const resolved = arr(brief?.resolved_objections);
  const worked = arr(brief?.what_has_worked);
  const points = arr(brief?.suggested_talking_points);
  const risks = arr(brief?.risks);

 const memoryFacts = [];
  return (
    <Card className="precall-card">
      <div className="precall-header">
        <div>
          <div className="section-kicker">PRE-CALL BRIEF</div>
          <h2>Everything DealMind remembers</h2>
          <p>
  Hindsight recalled{" "}
  <strong>
   {brief?.memory?.facts_considered || memoryFacts.length || 0}
  </strong>{" "}
  relevant memories for this deal.
</p>
        </div>

        <Button variant="secondary" onClick={onToggleRaw}>
          {showRaw ? "Hide raw memory" : "Show raw Hindsight memories"}
        </Button>
      </div>

      {brief?.summary && (
        <div className="brief-summary">
          {brief.summary}
        </div>
      )}

      <div className="brief-grid">
        <BriefList
  title="Open objections"
  items={objections}
  tone="red"
  icon="alert"
/>

        <BriefList
          title="What has worked"
          items={worked}
          tone="green"
          icon="check"
        />

        <BriefList
          title="Talking points"
          items={points}
          tone="blue"
          icon="spark"
        />

        <BriefList
          title="Risks"
          items={risks}
          tone="yellow"
          icon="alert"
        />
      </div>

      {resolved.length > 0 && (
        <div className="resolved-section">
          <div className="section-kicker">RESOLVED OBJECTIONS</div>

          <div className="resolved-list">
            {resolved.map((item, index) => (
              <div key={index}>
                <Icon name="check" size={14} />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {brief?.next_step && (
        <div className="next-step-banner">
          <div className="next-step-icon">
            <Icon name="arrow" size={18} />
          </div>

          <div>
            <span>Recommended next step</span>
            <strong>{brief.next_step}</strong>
          </div>
        </div>
      )}

      {showRaw && (
        <div className="raw-memory">
          <div className="section-kicker">RAW HINDSIGHT MEMORY</div>

          <pre>
            {JSON.stringify(
              brief?.memory || memoryFacts,
              null,
              2
            )}
          </pre>
        </div>
      )}
    </Card>
  );
}

function BriefList({ title, items, tone, icon }) {
  return (
    <div className={`brief-list brief-${tone}`}>
      <div className="brief-list-title">
        <span>
          <Icon name={icon} size={15} />
        </span>
        {title}
        <b>{items.length}</b>
      </div>

      {items.length === 0 ? (
  <div className="brief-empty">No signals found.</div>
) : (
  <ul>
    {items.slice(0, 6).map((item, index) => (
      <li key={index}>{displayText(item)}</li>
    ))}
  </ul>
)}
    </div>
  );
}
/* ---------------- WHAT DEALMIND LEARNED ---------------- */

function MemoryLearned({ brief, facts, calls }) {
  const objections = arr(brief?.open_objections);
  const worked = arr(brief?.what_has_worked);
  const risks = arr(brief?.risks);

  const competitors = arr(
    facts?.competitors || brief?.competitors
  );

  const stakeholders = arr(
    facts?.stakeholders || brief?.stakeholders
  );

  const commitments = arr(
    facts?.commitments || brief?.commitments
  );

  const memories =
  Number(brief?.memory?.count) ||
  Number(brief?.memory?.facts_considered) ||
  0;

  const learned = [
    {
      icon: "alert",
      title: "Customer concern",
      text: objections[0]
        ? displayText(objections[0])
        : "No open objection detected.",
      tone: "red",
    },
    {
      icon: "users",
      title: "Key stakeholder",
      text: stakeholders[0]
        ? displayText(stakeholders[0])
        : "No stakeholder signal yet.",
      tone: "blue",
    },
    {
      icon: "target",
      title: "Competitive signal",
      text: competitors[0]
        ? displayText(competitors[0])
        : "No competitor signal yet.",
      tone: "purple",
    },
    {
      icon: "check",
      title: "What worked",
      text: worked[0]
        ? displayText(worked[0])
        : "No successful approach recorded yet.",
      tone: "green",
    },
    {
      icon: "arrow",
      title: "Commitment",
      text: commitments[0]
        ? displayText(commitments[0])
        : brief?.next_step
        ? displayText(brief.next_step)
        : "No commitment recorded yet.",
      tone: "yellow",
    },
    {
      icon: "spark",
      title: "Risk to watch",
      text: risks[0]
        ? displayText(risks[0])
        : "No major risk detected.",
      tone: "orange",
    },
  ];

  return (
    <Card className="memory-learned-card">
      <div className="memory-learned-header">
        <div>
          <div className="section-kicker">
            CONTINUOUS LEARNING
          </div>

          <h2>
            🧠 What DealMind Learned
          </h2>

          <p>
            DealMind connected information across this deal's
            conversations and turned memory into actionable
            intelligence.
          </p>
        </div>

        <div className="memory-learned-stats">
          <div>
            <strong>{calls.length}</strong>
            <span>Conversations</span>
          </div>

          <div>
            <strong>{memories}</strong>
            <span>Memories used</span>
          </div>
        </div>
      </div>

      <div className="memory-learning-grid">
        {learned.map((item, index) => (
          <div
            className={`memory-learning-item memory-${item.tone}`}
            key={index}
          >
            <div className="memory-learning-icon">
              <Icon name={item.icon} size={16} />
            </div>

            <div>
              <span>{item.title}</span>
              <strong>{item.text}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="memory-learned-footer">
        <Icon name="spark" size={15} />

        <span>
          Every new conversation can update what DealMind
          remembers and how it prepares the next strategy.
        </span>
      </div>
    </Card>
  );
}

/* ---------------- LOG CALL ---------------- */

function LogCallModal({ dealId, onClose, onSaved }) {
  const [transcript, setTranscript] = useState(
    `Rep: Thanks for the time. Any update on the current concern?

Customer: We are still discussing the pricing with finance. The CFO also wants to understand the ROI before approving.

Rep: I will send the ROI model and a concise pricing justification today.`
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!transcript.trim()) return;

    setSaving(true);
    setError("");

    try {
      await post(`/api/deals/${dealId}/calls`, {
        transcript,
      });

      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Log conversation" onClose={onClose}>
      <div className="call-modal">
        <div className="call-context">
          <div className="call-context-icon">
            <Icon name="phone" size={18} />
          </div>

          <div>
            <strong>Add a new customer conversation</strong>
            <span>
              DealMind will send this interaction into your memory
              pipeline.
            </span>
          </div>
        </div>

        <label>Conversation transcript</label>

        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={10}
        />

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button
            icon="brain"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving memory..." : "Save to memory"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- MEMORY DEMO ---------------- */

function Demo({ onNewDeal }) {
  const [deals, setDeals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalling, setRecalling] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [memoryMode, setMemoryMode] = useState("mock");

  useEffect(() => {
    async function load() {
      try {
        const data = await get("/api/deals");
        const list = getDeals(data);

        setDeals(list);
        setMemoryMode(data?.memory_mode || "mock");

        if (list.length) {
          const detail = await get(`/api/deals/${getDealId(list[0])}`);
          setSelected({
            ...list[0],
            ...(detail?.deal || {}),
            calls: detail?.calls || [],
            facts: detail?.facts || {},
          });
          setMemoryMode(detail?.memory?.mode || data?.memory_mode || "mock");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function selectDeal(deal) {
    setSelected(deal);
    setBrief(null);
    setStep(0);
    setError("");

    try {
      const detail = await get(`/api/deals/${getDealId(deal)}`);
      setSelected({
        ...deal,
        ...(detail?.deal || {}),
        calls: detail?.calls || [],
        facts: detail?.facts || {},
      });
      setMemoryMode(detail?.memory?.mode || memoryMode);
    } catch (err) {
      setError(err.message);
    }
  }

  async function recall() {
    if (!selected) return;

    setRecalling(true);
    setError("");

    try {
      const id = getDealId(selected);
      const data = await get(`/api/deals/${id}/brief`);

      setBrief({
        ...(data?.brief || data?.data || data),
        memory: data?.memory || {},
        facts: data?.facts || {},
        memories: data?.memories || [],
      });
      setMemoryMode(data?.memory?.mode || memoryMode);
      setStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setRecalling(false);
    }
  }

  const calls = byDate(getCalls(selected));

  if (loading) return <Loading text="Loading memory demo..." />;

  return (
    <div className="demo-page">
      <div className="demo-hero">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            HINDSIGHT MEMORY IN ACTION
          </div>

          <h1>Watch DealMind get smarter.</h1>

          <p>
            The same agent behaves differently when it can remember
            what happened in previous conversations.
          </p>
        </div>
      </div>

      <ErrorBox error={error} />

      <Card className="demo-selector">
        <div>
          <div className="section-kicker">SELECT A DEAL</div>
          <h3>Choose a deal with conversation history</h3>
        </div>

        {deals.length === 0 ? (
          <div className="demo-empty-state">
            <div className="empty-icon">
              <Icon name="brain" size={23} />
            </div>
            <div>
              <strong>No deal history yet</strong>
              <p>Add a deal and its conversations to see memory connect past signals into a strategy.</p>
            </div>
            <Button variant="secondary" icon="plus" onClick={onNewDeal}>
              Create deal
            </Button>
          </div>
        ) : (
          <div className="demo-deals">
            {deals.map((deal) => (
            <button
              key={getDealId(deal)}
              className={
                selected &&
                getDealId(selected) === getDealId(deal)
                  ? "demo-deal active"
                  : "demo-deal"
              }
              onClick={() => selectDeal(deal)}
            >
              <div className="company-avatar">
                {getDealName(deal)
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div>
                <strong>{getDealName(deal)}</strong>
                <span>
                  {deal?.call_count ?? getCalls(deal).length} conversations
                </span>
              </div>
            </button>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <>
          <div className="learning-path">
            <DemoStep
              number="01"
              title="Call 1"
              text="Customer shares a concern"
              active={step >= 1}
            />
            <div className="path-line" />
            <DemoStep
              number="02"
              title="Remember"
              text="Hindsight stores the signal"
              active={step >= 2}
            />
            <div className="path-line" />
            <DemoStep
              number="03"
              title="Call 2+"
              text="More context arrives"
              active={step >= 3}
            />
            <div className="path-line" />
            <DemoStep
              number="04"
              title="Connect"
              text="Past + present combined"
              active={step >= 4}
            />
            <div className="path-line" />
            <DemoStep
              number="05"
              title="Strategy"
              text="Next action generated"
              active={step >= 5}
            />
          </div>

          <Card className="demo-memory-card">
            <div className="demo-memory-header">
              <div>
                <div className="section-kicker">
                  {getDealName(selected).toUpperCase()}
                </div>
                <h2>Same agent. Different memory.</h2>
              </div>

              <Badge tone="green">
                <span className="tiny-dot" />
                {memoryMode === "live" ? "Hindsight Live" : "Local memory"}
              </Badge>
            </div>

            <div className="comparison-grid">
              <div className="without-memory">
                <div className="comparison-label">
                  WITHOUT MEMORY
                </div>

                <div className="comparison-title">
                  Generic response
                </div>

                <div className="generic-agent">
                  <div className="agent-avatar gray">
                    AI
                  </div>

                  <div>
                    <strong>Agent forgets previous calls.</strong>

                    <ul>
                      <li>Review the account in CRM</li>
                      <li>Prepare an agenda</li>
                      <li>Ask about budget and timeline</li>
                      <li>Confirm next steps</li>
                    </ul>
                  </div>
                </div>

                <div className="memory-missing">
                  <Icon name="alert" size={15} />
                  No objections. No stakeholders. No commitments.
                </div>
              </div>

              <div className="with-memory">
                <div className="comparison-label">
                  WITH HINDSIGHT
                </div>

                <div className="comparison-title">
                  Personalized intelligence
                </div>

                <div className="memory-agent">
                  <div className="agent-avatar purple">
                    <Icon name="brain" size={19} />
                  </div>

                  <div>
                    <strong>
                      DealMind recalls the full deal history.
                    </strong>

                    <div className="memory-chips">
                      {calls.slice(0, 5).map((call, index) => (
                        <span key={index}>
                          <Icon name="check" size={12} />
                          Call {index + 1}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="memory-insights">
                  <MemoryInsight
                    icon="alert"
                    title="Customer concern"
                    text={
                      arr(selected?.facts?.open_objections)[0] ||
                      "No unresolved objection recorded."
                    }
                  />

                  <MemoryInsight
                    icon="users"
                    title="Stakeholder"
                    text={
                      arr(selected?.facts?.stakeholders)[0] ||
                      "No stakeholder signal recorded."
                    }
                  />

                  <MemoryInsight
                    icon="target"
                    title="Competition"
                    text={
                      arr(selected?.facts?.competitors)[0] ||
                      "No competitor signal recorded."
                    }
                  />

                  <MemoryInsight
                    icon="spark"
                    title="What worked"
                    text={
                      arr(selected?.facts?.what_worked)[0] ||
                      "No successful approach recorded."
                    }
                  />
                </div>
              </div>
            </div>

            <div className="demo-action">
              <div>
                <div className="section-kicker">
                  READY TO RECALL?
                </div>

                <strong>
                  Let Hindsight turn the conversation history into
                  strategy.
                </strong>
              </div>

              <Button
                icon="spark"
                onClick={() => {
                  setStep(1);

                  setTimeout(() => setStep(2), 350);
                  setTimeout(() => setStep(3), 700);
                  setTimeout(() => setStep(4), 1050);
                  setTimeout(() => recall(), 1400);
                }}
                disabled={recalling}
              >
                {recalling
                  ? "Connecting memory..."
                  : "Recall & Generate Strategy"}
              </Button>
            </div>
          </Card>

          {brief && (
            <div className="demo-result">
              <div className="result-heading">
                <div>
                  <div className="eyebrow">
                    <span className="live-dot" />
                    MEMORY-POWERED RESULT
                  </div>

                  <h2>DealMind learned from the past.</h2>
                </div>

                <Badge tone="green">
                  {brief?.memory?.facts_considered ?? 0}{" "}
                  memories recalled
                </Badge>
              </div>

              <MemoryStrategy
                brief={brief}
                facts={brief?.facts || brief?.memory || {}}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DemoStep({ number, title, text, active }) {
  return (
    <div className={`demo-step ${active ? "active" : ""}`}>
      <div className="demo-step-number">{number}</div>
      <strong>{title}</strong>
      <span>{displayText(text)}</span>
    </div>
  );
}

function MemoryInsight({ icon, title, text }) {
  return (
    <div className="memory-insight">
      <div className="memory-insight-icon">
        <Icon name={icon} size={15} />
      </div>

      <div>
        <strong>{title}</strong>
       <span>{displayText(text)}</span>
      </div>
    </div>
  );
}

/* ---------------- PLAYBOOK ---------------- */

function Playbook() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await get("/api/playbook");
        setData(result);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <Loading text="Loading learned playbook..." />;

  const patterns = arr(
    data?.patterns ||
      data?.patterns_learned ||
      data?.playbook ||
      data?.items
  );

  return (
    <div className="playbook-page">
      <div className="playbook-hero">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            COLLECTIVE DEAL LEARNING
          </div>

          <h1>What DealMind has learned.</h1>

          <p>
            Patterns extracted across conversations and deals,
            turning repeated customer signals into reusable sales
            intelligence.
          </p>
        </div>

        <div className="playbook-orb">
          <Icon name="brain" size={40} />
        </div>
      </div>

      {patterns.length === 0 ? (
        <Card className="playbook-empty">
          <div className="empty-icon">
            <Icon name="brain" size={25} />
          </div>

          <h3>Building your playbook</h3>

          <p>
            As more conversations enter Hindsight, DealMind will
            surface reusable patterns here.
          </p>
        </Card>
      ) : (
        <div className="playbook-grid">
          {patterns.map((pattern, index) => (
            <Card className="playbook-pattern" key={index}>
              <div className="pattern-number">
                {String(index + 1).padStart(2, "0")}
              </div>

              <h3>
                {pattern?.title ||
                  pattern?.name ||
                  `Learned pattern ${index + 1}`}
              </h3>

              <p>
                {pattern?.description ||
                  pattern?.summary ||
                  pattern?.text ||
                  pattern}
              </p>

              {pattern?.evidence && (
                <div className="pattern-evidence">
                  <Icon name="check" size={14} />
                  {pattern.evidence}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- NEW DEAL ---------------- */

function NewDealModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    value: "",
    stage: "discovery",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(e) {
    e.preventDefault();

    setSaving(true);
    setError("");

    try {
      const data = await post("/api/deals", {
        company_name: form.company_name,
        contact_name: form.contact_name,
        value: Number(form.value),
        stage: form.stage,
      });

      onCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Create a new deal" onClose={onClose}>
      <form onSubmit={submit} className="new-deal-form">
        <div className="form-intro">
          <div className="form-intro-icon">
            <Icon name="spark" size={20} />
          </div>

          <div>
            <strong>Start building deal memory</strong>
            <span>
              Every conversation you add can become intelligence.
            </span>
          </div>
        </div>

        <label>
          Company name
          <input
            value={form.company_name}
            onChange={(e) =>
              update("company_name", e.target.value)
            }
            placeholder="e.g. Acme Corp"
            required
          />
        </label>

        <label>
          Primary contact
          <input
            value={form.contact_name}
            onChange={(e) =>
              update("contact_name", e.target.value)
            }
            placeholder="e.g. Sarah Chen"
          />
        </label>

        <div className="form-row">
          <label>
            Deal value
            <div className="input-prefix">
              <span>$</span>
              <input
                type="number"
                value={form.value}
                onChange={(e) =>
                  update("value", e.target.value)
                }
                placeholder="185000"
                required
              />
            </div>
          </label>

          <label>
            Pipeline stage
            <select
              value={form.stage}
              onChange={(e) =>
                update("stage", e.target.value)
              }
            >
              <option value="discovery">Discovery</option>
              <option value="qualification">Qualification</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="closed_won">Closed Won</option>
            </select>
          </label>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button type="submit" icon="plus" disabled={saving}>
            {saving ? "Creating..." : "Create Deal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- APP ---------------- */

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handler = () => setPage("demo");

    window.addEventListener("deal-mind-demo", handler);

    return () =>
      window.removeEventListener("deal-mind-demo", handler);
  }, []);

  function openDeal(id) {
    setSelectedDeal(id);
    setPage("deal");
  }

  function navigate(next) {
    setPage(next);
    setSelectedDeal(null);
  }

  return (
    <>
      <Shell
        page={page === "deal" ? "Deal Intelligence" : page}
        setPage={navigate}
        onNewDeal={() => setShowNewDeal(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {page === "dashboard" && (
          <Dashboard
            onOpenDeal={openDeal}
            onNewDeal={() => setShowNewDeal(true)}
            searchQuery={searchQuery}
          />
        )}

        {page === "deal" && selectedDeal && (
          <DealDetail
            dealId={selectedDeal}
            onBack={() => navigate("dashboard")}
          />
        )}

        {page === "demo" && (
          <Demo onNewDeal={() => setShowNewDeal(true)} />
        )}

        {page === "playbook" && <Playbook />}
      </Shell>

      {showNewDeal && (
        <NewDealModal
          onClose={() => setShowNewDeal(false)}
          onCreated={() => {
            setShowNewDeal(false);
            setPage("dashboard");
            window.location.reload();
          }}
        />
      )}
    </>
  );
}