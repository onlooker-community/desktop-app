// Weekly Review view — full-width document-feel summary of the past 7 days.
// This replaces the old WeeklyReview modal component.

import { useMemo, useState } from "react";

const C = {
	bg0: "#0b0d14",
	bg1: "#12151f",
	bg2: "#181c2a",
	border: "#252a3d",
	borderAccent: "#2e3555",
	pink: "#f472b6",
	pinkDim: "#9d346b",
	cyan: "#22d3ee",
	yellow: "#fbbf24",
	green: "#4ade80",
	red: "#f87171",
	textPrimary: "#e2e8f0",
	textSecondary: "#94a3b8",
	textMuted: "#475569",
};

function scoreColor(s) {
	if (s == null) return C.textMuted;
	if (s >= 0.85) return C.green;
	if (s >= 0.7) return C.yellow;
	return C.red;
}

function StatItem({ label, value, delta, color }) {
	return (
		<div>
			<div
				style={{
					fontSize: 22,
					fontWeight: 700,
					color: color ?? C.textPrimary,
					fontFamily: "'JetBrains Mono', monospace",
					lineHeight: 1,
					marginBottom: 3,
				}}
			>
				{value}
			</div>
			<div style={{ fontSize: 11, color: C.textSecondary }}>{label}</div>
			{delta != null && (
				<div
					style={{
						fontSize: 10,
						color: delta >= 0 ? C.green : C.red,
						marginTop: 2,
					}}
				>
					{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}
				</div>
			)}
		</div>
	);
}

function DayRow({ session, isTop }) {
	const date = new Date(`${session.start}T12:00:00` || "").toLocaleDateString(
		"en-US",
		{
			weekday: "short",
			month: "short",
			day: "numeric",
		},
	);
	const score = session.avgScore;
	const color = scoreColor(score);

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 12,
				padding: "7px 12px",
				borderRadius: 6,
				marginBottom: 3,
				background: isTop ? `${C.green}0a` : "transparent",
				border: `1px solid ${isTop ? `${C.green}22` : "transparent"}`,
			}}
		>
			<span
				style={{
					width: 110,
					fontSize: 10,
					color: C.textMuted,
					fontFamily: "monospace",
					flexShrink: 0,
				}}
			>
				{date}
			</span>
			{/* Score bar */}
			<div
				style={{
					flex: 1,
					height: 3,
					borderRadius: 2,
					background: C.bg2,
					overflow: "hidden",
				}}
			>
				<div
					style={{
						width: `${(score ?? 0) * 100}%`,
						height: "100%",
						background: color,
						borderRadius: 2,
					}}
				/>
			</div>
			<span
				style={{
					fontSize: 10,
					color,
					fontFamily: "monospace",
					width: 32,
					textAlign: "right",
					flexShrink: 0,
				}}
			>
				{score?.toFixed(2) ?? "—"}
			</span>
			<span
				style={{
					fontSize: 10,
					color: C.textMuted,
					fontFamily: "monospace",
					width: 36,
					textAlign: "right",
					flexShrink: 0,
				}}
			>
				{session.events?.length ?? 0}ev
			</span>
			{session.blocks > 0 && (
				<span
					style={{
						fontSize: 9,
						color: C.red,
						background: `${C.red}15`,
						padding: "1px 5px",
						borderRadius: 3,
						fontFamily: "monospace",
						flexShrink: 0,
					}}
				>
					⊘ {session.blocks}
				</span>
			)}
			{session.warns > 0 && !session.blocks && (
				<span
					style={{
						fontSize: 9,
						color: C.yellow,
						background: `${C.yellow}15`,
						padding: "1px 5px",
						borderRadius: 3,
						fontFamily: "monospace",
						flexShrink: 0,
					}}
				>
					⚑ {session.warns}
				</span>
			)}
		</div>
	);
}

// Template-generated narrative from metrics (no API key required)
function generateNarrative(sessions, avgScore, totalBlocks, _totalWarns) {
	if (sessions.length === 0) return "No sessions this week.";

	const sorted = [...sessions]
		.filter((s) => s.avgScore != null)
		.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
	const best = sorted[0];
	const worst = sorted[sorted.length - 1];

	const scoreWord =
		avgScore >= 0.85 ? "Strong" : avgScore >= 0.7 ? "Solid" : "Challenging";
	const bestDate = best?.start
		? new Date(best.start).toLocaleDateString("en-US", { weekday: "long" })
		: null;
	const worstDate = worst?.start
		? new Date(worst.start).toLocaleDateString("en-US", { weekday: "long" })
		: null;

	let narrative = `${scoreWord} week overall (avg ${(avgScore * 100).toFixed(0)}%).`;
	if (bestDate && best?.avgScore) {
		narrative += ` ${bestDate} was your peak session (${best.avgScore.toFixed(2)}).`;
	}
	if (worst && worst.id !== best?.id && worst?.avgScore != null) {
		narrative += ` ${worstDate} had the lowest score (${worst.avgScore.toFixed(2)})`;
		if (worst.warns > 0 || worst.blocks > 0) {
			narrative += ` with ${worst.warns + worst.blocks} flags`;
		}
		narrative += ".";
	}
	if (totalBlocks > 0) {
		narrative += ` Sentinel blocked ${totalBlocks} operation${totalBlocks > 1 ? "s" : ""} this week.`;
	}
	narrative +=
		" Consider running Echo regression against your lowest-scoring session.";
	return narrative;
}

// ── Counsel layer-attributed brief ──────────────────────────────────────────
// Renders Counsel synthesis as expandable sections per cognitive layer.

const COUNSEL_LAYERS = [
	{
		key: "belief_tracking",
		label: "Belief Tracking",
		icon: "◎",
		color: "#818cf8",
		desc: "How well the agent tracked what is true vs. assumed",
	},
	{
		key: "planning",
		label: "Planning",
		icon: "◇",
		color: "#22d3ee",
		desc: "Quality of task decomposition and approach selection",
	},
	{
		key: "reflection",
		label: "Reflection",
		icon: "◈",
		color: "#fbbf24",
		desc: "Self-correction, dead-end recognition, and learning signals",
	},
	{
		key: "llm_revision",
		label: "LLM Revision",
		icon: "◆",
		color: "#f472b6",
		desc: "Instruction file quality and update effectiveness",
	},
];

function CounselBrief({ brief }) {
	const [expandedLayer, setExpandedLayer] = useState(null);

	if (!brief || typeof brief !== "object") return null;

	// Accept both flat object with layer keys and nested { layers: {...} }
	const layers = brief.layers ?? brief;
	const hasLayers = COUNSEL_LAYERS.some((l) => layers[l.key]);

	if (!hasLayers) return null;

	return (
		<div style={{ marginBottom: 24 }}>
			<div
				style={{
					fontSize: 10,
					color: C.textMuted,
					letterSpacing: "0.06em",
					textTransform: "uppercase",
					fontFamily: "monospace",
					marginBottom: 10,
				}}
			>
				Counsel Brief
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
				{COUNSEL_LAYERS.map((layer) => {
					const data = layers[layer.key];
					if (!data) return null;
					const isOpen = expandedLayer === layer.key;
					const findings =
						data.findings ??
						data.items ??
						(typeof data === "string" ? [data] : []);
					const plugins = data.plugins ?? data.attributed_plugins ?? [];
					const sessions = data.sessions ?? data.source_sessions ?? [];

					return (
						<div
							key={layer.key}
							style={{
								background: C.bg2,
								borderRadius: 8,
								border: `1px solid ${isOpen ? `${layer.color}44` : C.border}`,
								overflow: "hidden",
								transition: "border-color 0.15s",
							}}
						>
							<button
								type="button"
								onClick={() => setExpandedLayer(isOpen ? null : layer.key)}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 10,
									padding: "10px 14px",
									width: "100%",
									textAlign: "left",
									cursor: "pointer",
									background: isOpen ? `${layer.color}08` : "transparent",
									border: "none",
									font: "inherit",
									color: "inherit",
									transition: "background 0.15s",
								}}
								onMouseEnter={(e) => {
									if (!isOpen)
										e.currentTarget.style.background = `${layer.color}06`;
								}}
								onMouseLeave={(e) => {
									if (!isOpen) e.currentTarget.style.background = "transparent";
								}}
							>
								<span style={{ fontSize: 14, color: layer.color }}>
									{layer.icon}
								</span>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontSize: 11,
											fontWeight: 600,
											color: C.textPrimary,
										}}
									>
										{layer.label}
									</div>
									<div style={{ fontSize: 9, color: C.textMuted }}>
										{layer.desc}
									</div>
								</div>
								{plugins.length > 0 && (
									<div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
										{plugins.slice(0, 3).map((p) => (
											<span
												key={p}
												style={{
													fontSize: 8,
													fontFamily: "monospace",
													padding: "1px 4px",
													borderRadius: 3,
													background: C.bg3,
													color: C.textMuted,
												}}
											>
												{p}
											</span>
										))}
									</div>
								)}
								<span style={{ fontSize: 9, color: C.textMuted }}>
									{isOpen ? "▼" : "▶"}
								</span>
							</button>

							{isOpen && findings.length > 0 && (
								<div
									style={{
										padding: "8px 14px 12px",
										borderTop: `1px solid ${C.border}`,
									}}
								>
									{findings.map((finding, i) => {
										const text =
											typeof finding === "string"
												? finding
												: (finding.text ??
													finding.description ??
													JSON.stringify(finding));
										const sessionRef =
											typeof finding === "object"
												? (finding.session ?? finding.session_id)
												: null;
										return (
											<div
												key={`${layer.key}-${typeof text === "string" ? text.slice(0, 30) : "f"}-${sessionRef ?? ""}`}
												style={{
													fontSize: 11,
													color: C.textSecondary,
													lineHeight: 1.6,
													padding: "4px 0",
													borderBottom:
														i < findings.length - 1
															? `1px solid ${C.border}`
															: "none",
													display: "flex",
													gap: 8,
													alignItems: "flex-start",
												}}
											>
												<span
													style={{
														color: layer.color,
														flexShrink: 0,
														marginTop: 2,
													}}
												>
													•
												</span>
												<span style={{ flex: 1 }}>{text}</span>
												{sessionRef && (
													<span
														style={{
															fontSize: 9,
															fontFamily: "monospace",
															color: C.cyan,
															flexShrink: 0,
															padding: "1px 4px",
															borderRadius: 3,
															background: `${C.cyan}11`,
														}}
													>
														{sessionRef.slice(0, 8)}…
													</span>
												)}
											</div>
										);
									})}

									{/* Source sessions */}
									{sessions.length > 0 && (
										<div
											style={{
												marginTop: 8,
												paddingTop: 8,
												borderTop: `1px solid ${C.border}`,
											}}
										>
											<div
												style={{
													fontSize: 9,
													color: C.textMuted,
													marginBottom: 4,
												}}
											>
												Source sessions:
											</div>
											<div
												style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
											>
												{sessions.map((sid) => (
													<span
														key={sid}
														style={{
															fontSize: 9,
															fontFamily: "monospace",
															color: C.cyan,
															padding: "2px 6px",
															borderRadius: 3,
															background: `${C.cyan}11`,
														}}
													>
														{typeof sid === "string" && sid.length > 12
															? `${sid.slice(0, 8)}…`
															: sid}
													</span>
												))}
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default function WeeklyReview({ sessions, onNavigateToSession }) {
	const [counselKeyConnected, _setCounselKeyConnected] = useState(false);
	const [dismissed, setDismissed] = useState(false);

	// Filter to last 7 days
	const weekAgo = new Date(Date.now() - 7 * 86400000);
	const thisWeek = useMemo(
		() => sessions.filter((s) => s.start && new Date(s.start) >= weekAgo),
		[sessions, weekAgo],
	);

	const avgScore = useMemo(() => {
		const scores = thisWeek
			.filter((s) => s.avgScore != null)
			.map((s) => s.avgScore);
		return scores.length
			? scores.reduce((a, b) => a + b, 0) / scores.length
			: null;
	}, [thisWeek]);

	const totalEvents = useMemo(
		() => thisWeek.reduce((a, s) => a + (s.events?.length ?? 0), 0),
		[thisWeek],
	);
	const totalBlocks = useMemo(
		() => thisWeek.reduce((a, s) => a + (s.blocks ?? 0), 0),
		[thisWeek],
	);
	const totalWarns = useMemo(
		() => thisWeek.reduce((a, s) => a + (s.warns ?? 0), 0),
		[thisWeek],
	);
	const maxScore = useMemo(
		() =>
			Math.max(
				...thisWeek.filter((s) => s.avgScore != null).map((s) => s.avgScore),
				0,
			),
		[thisWeek],
	);

	// Sort by day for the day-row table
	const byDay = useMemo(
		() => [...thisWeek].sort((a, b) => new Date(a.start) - new Date(b.start)),
		[thisWeek],
	);

	const narrative = useMemo(
		() => generateNarrative(thisWeek, avgScore ?? 0, totalBlocks, totalWarns),
		[thisWeek, avgScore, totalBlocks, totalWarns],
	);

	const flaggedSessions = useMemo(
		() =>
			thisWeek
				.filter(
					(s) =>
						s.blocks > 0 ||
						s.warns > 0 ||
						(s.avgScore != null && s.avgScore < 0.75),
				)
				.sort((a, b) => (a.avgScore ?? 1) - (b.avgScore ?? 1)),
		[thisWeek],
	);

	const weekStart = new Date(weekAgo).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
	const weekEnd = new Date().toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

	return (
		<div style={{ height: "100%", overflowY: "auto" }}>
			<div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 24px" }}>
				{/* Header */}
				<div style={{ marginBottom: 28 }}>
					<div
						style={{
							fontSize: 11,
							color: C.pink,
							fontWeight: 700,
							letterSpacing: "0.12em",
							fontFamily: "monospace",
							textTransform: "uppercase",
							marginBottom: 4,
						}}
					>
						Weekly Review
					</div>
					<div style={{ fontSize: 11, color: C.textMuted }}>
						{weekStart} – {weekEnd}
					</div>
				</div>

				{thisWeek.length === 0 ? (
					<div
						style={{
							textAlign: "center",
							padding: "40px 0",
							color: C.textMuted,
							fontSize: 13,
						}}
					>
						No sessions this week yet.
					</div>
				) : (
					<>
						{/* Week at a glance */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(4, 1fr)",
								gap: 12,
								marginBottom: 28,
							}}
						>
							<StatItem
								label="Avg Score"
								value={avgScore?.toFixed(2) ?? "—"}
								color={scoreColor(avgScore)}
							/>
							<StatItem label="Sessions" value={thisWeek.length} />
							<StatItem label="Total Events" value={totalEvents} />
							<StatItem
								label="Blocks"
								value={totalBlocks}
								color={totalBlocks > 0 ? C.red : C.textPrimary}
							/>
						</div>

						{/* Day-by-day rows */}
						<div style={{ marginBottom: 28 }}>
							<div
								style={{
									fontSize: 10,
									color: C.textMuted,
									letterSpacing: "0.06em",
									textTransform: "uppercase",
									fontFamily: "monospace",
									marginBottom: 10,
								}}
							>
								Day by Day
							</div>
							{byDay.map((s) => (
								<DayRow
									key={s.id}
									session={s}
									isTop={s.avgScore === maxScore && maxScore > 0}
								/>
							))}
						</div>

						{/* Synthesis */}
						<div
							style={{
								background: C.bg2,
								borderRadius: 10,
								padding: "18px 20px",
								border: `1px solid ${C.border}`,
								marginBottom: 24,
							}}
						>
							<div
								style={{
									fontSize: 10,
									color: C.textMuted,
									letterSpacing: "0.06em",
									textTransform: "uppercase",
									fontFamily: "monospace",
									marginBottom: 10,
								}}
							>
								Synthesis
							</div>
							<div
								style={{
									fontSize: 13,
									color: C.textSecondary,
									lineHeight: 1.7,
									fontStyle: "italic",
								}}
							>
								"{narrative}"
							</div>
						</div>

						{/* Counsel layer-attributed brief */}
						{(() => {
							// Extract Counsel brief data from session events
							const counselEvents = thisWeek.flatMap((s) =>
								(s.events ?? []).filter((e) => e.plugin === "counsel"),
							);
							// Find the most recent brief (Counsel emits structured briefs)
							const briefEvent = counselEvents
								.filter(
									(e) =>
										e.meta?.layers ||
										e.meta?.belief_tracking ||
										e.meta?.planning,
								)
								.sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
							const brief = briefEvent?.meta;
							return brief ? <CounselBrief brief={brief} /> : null;
						})()}

						{/* Counsel upsell — shown once, dismissible */}
						{!counselKeyConnected && !dismissed && (
							<div
								style={{
									background: C.bg1,
									borderRadius: 10,
									padding: "16px 18px",
									border: `1px solid ${C.borderAccent}`,
									marginBottom: 24,
									boxShadow: `0 0 20px ${C.pink}08`,
								}}
							>
								<div
									style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
								>
									<div style={{ fontSize: 16, color: C.pink, flexShrink: 0 }}>
										✦
									</div>
									<div style={{ flex: 1 }}>
										<div
											style={{
												fontSize: 12,
												fontWeight: 600,
												color: C.textPrimary,
												marginBottom: 4,
											}}
										>
											Enable AI synthesis
										</div>
										<div
											style={{
												fontSize: 11,
												color: C.textSecondary,
												lineHeight: 1.6,
												marginBottom: 12,
											}}
										>
											Connect an Anthropic API key to generate a narrative
											weekly review with Counsel. Uses ~2,000 tokens per review
											(~$0.03).
										</div>
										<div style={{ display: "flex", gap: 8 }}>
											<button
												type="button"
												onClick={() => window.onlooker.window.close()}
												style={{
													fontSize: 11,
													padding: "6px 14px",
													borderRadius: 6,
													border: `1px solid ${C.pinkDim}`,
													background: `${C.pink}15`,
													color: C.pink,
													cursor: "pointer",
													transition: "all 0.15s",
												}}
												onMouseEnter={(e) =>
													(e.currentTarget.style.background = `${C.pink}25`)
												}
												onMouseLeave={(e) =>
													(e.currentTarget.style.background = `${C.pink}15`)
												}
											>
												Connect API key →
											</button>
											<button
												type="button"
												onClick={() => setDismissed(true)}
												style={{
													fontSize: 11,
													padding: "6px 14px",
													borderRadius: 6,
													border: `1px solid ${C.border}`,
													background: "transparent",
													color: C.textMuted,
													cursor: "pointer",
													transition: "all 0.15s",
												}}
											>
												Not now
											</button>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Flagged sessions */}
						{flaggedSessions.length > 0 && (
							<div style={{ marginBottom: 24 }}>
								<div
									style={{
										fontSize: 10,
										color: C.textMuted,
										letterSpacing: "0.06em",
										textTransform: "uppercase",
										fontFamily: "monospace",
										marginBottom: 10,
									}}
								>
									Needs Attention
								</div>
								{flaggedSessions.map((s) => (
									<button
										key={s.id}
										type="button"
										onClick={() => onNavigateToSession?.(s.id)}
										style={{
											display: "flex",
											alignItems: "center",
											gap: 10,
											padding: "8px 12px",
											background: C.bg2,
											borderRadius: 6,
											marginBottom: 6,
											border: `1px solid ${C.border}`,
											width: "100%",
											textAlign: "left",
											cursor: onNavigateToSession ? "pointer" : "default",
											font: "inherit",
											color: "inherit",
											transition: "border-color 0.15s",
										}}
										onMouseEnter={(e) => {
											if (onNavigateToSession)
												e.currentTarget.style.borderColor = C.borderAccent;
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.borderColor = C.border;
										}}
									>
										<span
											style={{
												fontSize: 10,
												color: scoreColor(s.avgScore),
												fontFamily: "monospace",
												fontWeight: 700,
											}}
										>
											{s.avgScore?.toFixed(2) ?? "—"}
										</span>
										<span
											style={{
												fontSize: 10,
												color: onNavigateToSession ? C.cyan : C.textMuted,
												fontFamily: "monospace",
												textDecoration: onNavigateToSession
													? "underline"
													: "none",
												textDecorationColor: `${C.cyan}44`,
											}}
										>
											{s.id?.slice(0, 16)}…
										</span>
										<span
											style={{
												fontSize: 10,
												color: C.textMuted,
												marginLeft: "auto",
											}}
										>
											{s.blocks > 0 && (
												<span style={{ color: C.red }}>⊘ {s.blocks} </span>
											)}
											{s.warns > 0 && (
												<span style={{ color: C.yellow }}>⚑ {s.warns}</span>
											)}
										</span>
										{onNavigateToSession && (
											<span style={{ fontSize: 9, color: C.textMuted }}>→</span>
										)}
									</button>
								))}
							</div>
						)}

						{/* Export row */}
						<div style={{ display: "flex", gap: 8 }}>
							<ActionBtn label="Export markdown" onClick={() => {}} />
							<ActionBtn
								label="Run Echo regression"
								onClick={() => window.onlooker.plugins.run("echo", "run", [])}
							/>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

function ActionBtn({ label, onClick }) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				fontSize: 11,
				padding: "7px 14px",
				borderRadius: 7,
				border: `1px solid ${C.border}`,
				background: "transparent",
				color: C.textSecondary,
				cursor: "pointer",
				transition: "all 0.15s",
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.color = C.textPrimary;
				e.currentTarget.style.borderColor = C.borderAccent;
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.color = C.textSecondary;
				e.currentTarget.style.borderColor = C.border;
			}}
		>
			{label}
		</button>
	);
}
