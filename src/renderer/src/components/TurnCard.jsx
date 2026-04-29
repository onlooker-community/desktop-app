// TurnCard — collapsible card for a single turn in a Claude Code session.
// A turn = user prompt → oracle calibration → N tool calls → Stop.
//
// Props:
//   turn: { turn, start, end, events, toolCalls, avgScore, cost,
//           inputTokens, outputTokens, status, inProgress }
//   defaultExpanded: boolean (default false)

import { useState } from "react";
import { PLUGIN_COLORS, PLUGIN_LABELS, STATUS_COLORS } from "../plugins.js";

const C = {
	bg0: "#0b0d14",
	bg1: "#12151f",
	bg2: "#181c2a",
	bg3: "#1f2335",
	border: "#252a3d",
	borderAccent: "#2e3555",
	pink: "#f472b6",
	cyan: "#22d3ee",
	yellow: "#fbbf24",
	green: "#4ade80",
	red: "#f87171",
	purple: "#a78bfa",
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

function formatTime(ts) {
	if (!ts) return "";
	return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}

function formatDuration(start, end) {
	if (!start || !end) return "";
	const ms = new Date(end) - new Date(start);
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(cost) {
	if (cost == null) return "";
	if (cost < 0.01) return `$${cost.toFixed(4)}`;
	return `$${cost.toFixed(3)}`;
}

function PluginBadge({ plugin }) {
	const color = PLUGIN_COLORS[plugin] ?? C.textMuted;
	return (
		<span
			style={{
				fontSize: 9,
				fontWeight: 700,
				letterSpacing: "0.08em",
				padding: "1px 5px",
				borderRadius: 3,
				border: `1px solid ${color}44`,
				color,
				background: `${color}11`,
				fontFamily: "'JetBrains Mono', monospace",
			}}
		>
			{PLUGIN_LABELS[plugin] ?? plugin?.toUpperCase()}
		</span>
	);
}

function MiniEvent({ event }) {
	const statusColor = STATUS_COLORS[event.status] ?? C.textMuted;
	const [expanded, setExpanded] = useState(false);
	const hasMeta = event.meta && Object.keys(event.meta).length > 0;

	const inner = (
		<>
			<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
				<div
					style={{
						width: 5,
						height: 5,
						borderRadius: "50%",
						flexShrink: 0,
						background: statusColor,
						boxShadow: `0 0 3px ${statusColor}66`,
					}}
				/>
				<PluginBadge plugin={event.plugin} />
				<span
					style={{
						fontSize: 10,
						color: C.textSecondary,
						flex: 1,
						minWidth: 0,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{event.label}
				</span>
				<span
					style={{
						fontSize: 9,
						color: C.textMuted,
						fontFamily: "monospace",
						flexShrink: 0,
					}}
				>
					{formatTime(event.ts)}
				</span>
			</div>
			{event.detail && (
				<div
					style={{
						fontSize: 9,
						color: C.textMuted,
						fontFamily: "monospace",
						marginTop: 1,
						paddingLeft: 17,
					}}
				>
					{event.detail}
				</div>
			)}
			{expanded && hasMeta && (
				<div
					style={{
						marginTop: 4,
						marginLeft: 17,
						padding: "5px 8px",
						background: C.bg0,
						borderRadius: 4,
						border: `1px solid ${C.border}`,
						fontSize: 9,
						fontFamily: "monospace",
						color: C.cyan,
						lineHeight: 1.5,
					}}
				>
					{JSON.stringify(event.meta, null, 2)}
				</div>
			)}
		</>
	);

	if (hasMeta) {
		return (
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				style={{
					padding: "3px 0",
					cursor: "pointer",
					background: "none",
					border: "none",
					width: "100%",
					textAlign: "left",
				}}
			>
				{inner}
			</button>
		);
	}
	return <div style={{ padding: "3px 0" }}>{inner}</div>;
}

// Structured outcome rendering per tool type — replaces raw JSON for common tools.
function ToolOutcomeDetail({ toolName, events }) {
	// Find the PostToolUse or tool_outcome event with the richest data
	const outcomeEvent = events.find((e) => e.type === "tool_outcome");
	const postEvent = events.find(
		(e) => e.hook_type === "PostToolUse" || e.type === "PostToolUse",
	);
	const meta = outcomeEvent?.meta ?? postEvent?.meta ?? {};
	const name = toolName?.toLowerCase();

	if (name === "bash") {
		const exitCode = meta.exit_code ?? meta.exitCode;
		const stdout = meta.stdout ?? meta.output ?? meta.output_summary;
		const stderr = meta.stderr;
		const command = meta.command ?? meta.input?.command;
		return (
			<div style={{ padding: "6px 0 2px 16px" }}>
				{command && (
					<div
						style={{
							fontSize: 9,
							fontFamily: "monospace",
							color: C.cyan,
							marginBottom: 4,
							padding: "3px 6px",
							background: C.bg0,
							borderRadius: 3,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						$ {command}
					</div>
				)}
				<div
					style={{
						display: "flex",
						gap: 8,
						alignItems: "center",
						marginBottom: 3,
					}}
				>
					{exitCode != null && (
						<span
							style={{
								fontSize: 9,
								fontWeight: 700,
								fontFamily: "monospace",
								padding: "1px 5px",
								borderRadius: 3,
								color: exitCode === 0 ? C.green : C.red,
								background: exitCode === 0 ? `${C.green}15` : `${C.red}15`,
								border: `1px solid ${exitCode === 0 ? `${C.green}33` : `${C.red}33`}`,
							}}
						>
							exit {exitCode}
						</span>
					)}
				</div>
				{stderr && (
					<pre
						style={{
							fontSize: 9,
							fontFamily: "monospace",
							color: C.red,
							margin: "2px 0",
							padding: "3px 6px",
							background: `${C.red}08`,
							borderRadius: 3,
							whiteSpace: "pre-wrap",
							wordBreak: "break-all",
							maxHeight: 80,
							overflow: "auto",
						}}
					>
						{stderr.length > 300 ? `${stderr.slice(0, 300)}…` : stderr}
					</pre>
				)}
				{stdout && (
					<pre
						style={{
							fontSize: 9,
							fontFamily: "monospace",
							color: C.textMuted,
							margin: "2px 0",
							padding: "3px 6px",
							background: C.bg0,
							borderRadius: 3,
							whiteSpace: "pre-wrap",
							wordBreak: "break-all",
							maxHeight: 80,
							overflow: "auto",
						}}
					>
						{stdout.length > 300 ? `${stdout.slice(0, 300)}…` : stdout}
					</pre>
				)}
			</div>
		);
	}

	if (name === "read") {
		const filePath = meta.target ?? meta.file_path ?? meta.path;
		const lineCount = meta.line_count ?? meta.lines;
		const bytes = meta.bytes ?? meta.size;
		return (
			<div
				style={{
					padding: "4px 0 2px 16px",
					display: "flex",
					gap: 8,
					alignItems: "center",
					flexWrap: "wrap",
				}}
			>
				{filePath && (
					<span style={{ fontSize: 9, fontFamily: "monospace", color: C.cyan }}>
						{filePath.length > 60 ? `…${filePath.slice(-57)}` : filePath}
					</span>
				)}
				{lineCount != null && (
					<span
						style={{ fontSize: 9, fontFamily: "monospace", color: C.textMuted }}
					>
						{lineCount} lines
					</span>
				)}
				{bytes != null && (
					<span
						style={{ fontSize: 9, fontFamily: "monospace", color: C.textMuted }}
					>
						{bytes > 1024 ? `${(bytes / 1024).toFixed(1)}KB` : `${bytes}B`}
					</span>
				)}
			</div>
		);
	}

	if (name === "write" || name === "edit") {
		const filePath = meta.target ?? meta.file_path ?? meta.path;
		const linesAdded = meta.lines_added ?? meta.added;
		const linesRemoved = meta.lines_removed ?? meta.removed;
		const diffSummary = meta.diff_summary ?? meta.output_summary;
		return (
			<div style={{ padding: "4px 0 2px 16px" }}>
				<div
					style={{
						display: "flex",
						gap: 8,
						alignItems: "center",
						flexWrap: "wrap",
					}}
				>
					{filePath && (
						<span
							style={{ fontSize: 9, fontFamily: "monospace", color: C.cyan }}
						>
							{filePath.length > 60 ? `…${filePath.slice(-57)}` : filePath}
						</span>
					)}
					{linesAdded != null && (
						<span
							style={{ fontSize: 9, fontFamily: "monospace", color: C.green }}
						>
							+{linesAdded}
						</span>
					)}
					{linesRemoved != null && (
						<span
							style={{ fontSize: 9, fontFamily: "monospace", color: C.red }}
						>
							-{linesRemoved}
						</span>
					)}
				</div>
				{diffSummary && (
					<div
						style={{
							fontSize: 9,
							fontFamily: "monospace",
							color: C.textMuted,
							marginTop: 3,
							padding: "3px 6px",
							background: C.bg0,
							borderRadius: 3,
							whiteSpace: "pre-wrap",
							maxHeight: 60,
							overflow: "auto",
						}}
					>
						{diffSummary.length > 200
							? `${diffSummary.slice(0, 200)}…`
							: diffSummary}
					</div>
				)}
			</div>
		);
	}

	if (name === "webfetch") {
		const url = meta.url ?? meta.target;
		const statusCode = meta.status_code ?? meta.status ?? meta.http_status;
		const contentType = meta.content_type;
		const bytes = meta.bytes ?? meta.response_size;
		return (
			<div
				style={{
					padding: "4px 0 2px 16px",
					display: "flex",
					gap: 8,
					alignItems: "center",
					flexWrap: "wrap",
				}}
			>
				{statusCode != null && (
					<span
						style={{
							fontSize: 9,
							fontWeight: 700,
							fontFamily: "monospace",
							padding: "1px 5px",
							borderRadius: 3,
							color: statusCode < 400 ? C.green : C.red,
							background: statusCode < 400 ? `${C.green}15` : `${C.red}15`,
						}}
					>
						{statusCode}
					</span>
				)}
				{url && (
					<span
						style={{
							fontSize: 9,
							fontFamily: "monospace",
							color: C.cyan,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							maxWidth: 300,
						}}
					>
						{url}
					</span>
				)}
				{contentType && (
					<span
						style={{ fontSize: 9, fontFamily: "monospace", color: C.textMuted }}
					>
						{contentType}
					</span>
				)}
				{bytes != null && (
					<span
						style={{ fontSize: 9, fontFamily: "monospace", color: C.textMuted }}
					>
						{bytes > 1024 ? `${(bytes / 1024).toFixed(1)}KB` : `${bytes}B`}
					</span>
				)}
			</div>
		);
	}

	if (name === "grep" || name === "glob") {
		const pattern = meta.pattern ?? meta.query;
		const matchCount = meta.match_count ?? meta.matches ?? meta.count;
		return (
			<div
				style={{
					padding: "4px 0 2px 16px",
					display: "flex",
					gap: 8,
					alignItems: "center",
					flexWrap: "wrap",
				}}
			>
				{pattern && (
					<span
						style={{ fontSize: 9, fontFamily: "monospace", color: C.purple }}
					>
						/{pattern}/
					</span>
				)}
				{matchCount != null && (
					<span
						style={{ fontSize: 9, fontFamily: "monospace", color: C.textMuted }}
					>
						{matchCount} match{matchCount !== 1 ? "es" : ""}
					</span>
				)}
			</div>
		);
	}

	// Fallback: no structured rendering available
	return null;
}

function ToolCallGroup({ toolCall, defaultExpanded }) {
	const [expanded, setExpanded] = useState(defaultExpanded ?? false);

	// Find the tool_outcome event in this group for summary display
	const outcomeEvent = toolCall.events.find((e) => e.type === "tool_outcome");
	const outcome = outcomeEvent?.meta;
	const result = outcome?.result;
	const target = outcome?.target;
	const resultColor =
		result === "failure" ? C.red : result === "success" ? C.green : C.textMuted;

	// Shorten target for inline display
	const shortTarget = target
		? target.length > 50
			? `…${target.slice(-45)}`
			: target
		: null;

	return (
		<div
			style={{
				marginLeft: 12,
				borderLeft: `1px solid ${result === "failure" ? `${C.red}66` : C.border}`,
				paddingLeft: 10,
				marginBottom: 4,
			}}
		>
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 6,
					cursor: "pointer",
					padding: "3px 0",
					background: "none",
					border: "none",
					width: "100%",
					textAlign: "left",
				}}
			>
				<span style={{ fontSize: 9, color: C.textMuted }}>
					{expanded ? "▼" : "▶"}
				</span>

				{/* Result indicator */}
				{result && (
					<div
						style={{
							width: 5,
							height: 5,
							borderRadius: "50%",
							flexShrink: 0,
							background: resultColor,
							boxShadow: `0 0 3px ${resultColor}66`,
						}}
					/>
				)}

				<span
					style={{
						fontSize: 10,
						fontWeight: 600,
						color: C.cyan,
						fontFamily: "'JetBrains Mono', monospace",
					}}
				>
					{toolCall.toolName}
				</span>

				{/* Target (file path, command, etc.) */}
				{shortTarget && (
					<span
						style={{
							fontSize: 9,
							color: C.textSecondary,
							flex: 1,
							minWidth: 0,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							fontFamily: "monospace",
						}}
					>
						{shortTarget}
					</span>
				)}

				{!shortTarget && (
					<span style={{ fontSize: 9, color: C.textMuted }}>
						{toolCall.events.length} event
						{toolCall.events.length !== 1 ? "s" : ""}
					</span>
				)}
			</button>

			{/* Output summary (visible even when collapsed, if we have one) */}
			{!expanded && outcome?.output_summary && (
				<div
					style={{
						fontSize: 9,
						color: C.textMuted,
						fontFamily: "monospace",
						paddingLeft: 16,
						marginTop: 1,
						marginBottom: 2,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{outcome.output_summary}
				</div>
			)}

			{/* Error message for failures (always visible) */}
			{!expanded && outcome?.error && (
				<div
					style={{
						fontSize: 9,
						color: C.red,
						fontFamily: "monospace",
						paddingLeft: 16,
						marginTop: 1,
						marginBottom: 2,
					}}
				>
					{outcome.error.length > 120
						? `${outcome.error.slice(0, 120)}…`
						: outcome.error}
				</div>
			)}

			{expanded && (
				<div style={{ paddingLeft: 4 }}>
					{/* Structured outcome for common tools */}
					<ToolOutcomeDetail
						toolName={toolCall.toolName}
						events={toolCall.events}
					/>
					{/* Individual plugin events (oracle, tribunal, warden, etc.) */}
					{toolCall.events.map((e) => (
						<MiniEvent key={`${e.ts}-${e.plugin}-${e.type}`} event={e} />
					))}
				</div>
			)}
		</div>
	);
}

export default function TurnCard({ turn, defaultExpanded = false }) {
	const [expanded, setExpanded] = useState(defaultExpanded);

	// Extract user prompt preview from UserPromptSubmit event
	const promptPreview = (() => {
		const promptEvent = turn.events.find(
			(e) =>
				e.hook_type === "UserPromptSubmit" ||
				e.type === "UserPromptSubmit" ||
				(e.plugin === "core/onlooker" && e.label?.startsWith("User prompt")),
		);
		const text =
			promptEvent?.meta?.message ??
			promptEvent?.meta?.prompt_text ??
			promptEvent?.detail ??
			null;
		if (!text) return null;
		const cleaned = text.replace(/\s+/g, " ").trim();
		return cleaned.length > 60 ? `${cleaned.slice(0, 57)}…` : cleaned;
	})();

	const borderColor = turn.inProgress
		? C.green
		: turn.status === "block"
			? C.red
			: turn.status === "warn" || turn.status === "fail"
				? C.yellow
				: C.border;

	// Events that aren't part of any tool call (turn_start, oracle calibration, etc.)
	const toolCallEventSet = new Set(turn.toolCalls.flatMap((tc) => tc.events));
	const nonToolEvents = turn.events.filter((e) => !toolCallEventSet.has(e));

	// Separate preamble (before first tool call) and postamble (after last)
	const firstToolTime = turn.toolCalls[0]?.events[0]?.ts;
	const lastToolTime =
		turn.toolCalls[turn.toolCalls.length - 1]?.events.slice(-1)[0]?.ts;

	const preamble = nonToolEvents.filter(
		(e) => !firstToolTime || new Date(e.ts) <= new Date(firstToolTime),
	);
	const postamble = nonToolEvents.filter(
		(e) => lastToolTime && new Date(e.ts) > new Date(lastToolTime),
	);

	return (
		<div
			style={{
				margin: "4px 0",
				borderRadius: 6,
				border: `1px solid ${borderColor}`,
				background: C.bg1,
				overflow: "hidden",
				transition: "border-color 0.15s",
			}}
		>
			{/* Header — always visible */}
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					padding: "8px 14px",
					cursor: "pointer",
					background: expanded ? C.bg2 : "transparent",
					transition: "background 0.1s",
					width: "100%",
					border: "none",
					textAlign: "left",
				}}
				onMouseEnter={(e) => {
					if (!expanded) e.currentTarget.style.background = `${C.bg2}88`;
				}}
				onMouseLeave={(e) => {
					if (!expanded) e.currentTarget.style.background = "transparent";
				}}
			>
				<span style={{ fontSize: 10, color: C.textMuted }}>
					{expanded ? "▼" : "▶"}
				</span>

				{/* Turn number */}
				<span
					style={{
						fontSize: 10,
						fontWeight: 700,
						color: C.pink,
						fontFamily: "'JetBrains Mono', monospace",
						minWidth: 42,
					}}
				>
					T{turn.turn}
				</span>

				{/* User prompt preview */}
				{promptPreview && (
					<span
						style={{
							fontSize: 10,
							color: C.textSecondary,
							flex: 1,
							minWidth: 0,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							fontStyle: "italic",
						}}
					>
						{promptPreview}
					</span>
				)}

				{/* In-progress indicator */}
				{turn.inProgress && (
					<span
						style={{
							fontSize: 8,
							fontWeight: 700,
							color: C.green,
							padding: "1px 5px",
							borderRadius: 3,
							border: `1px solid ${C.green}44`,
							background: `${C.green}11`,
							fontFamily: "'JetBrains Mono', monospace",
							animation: "pulse 2s infinite",
						}}
					>
						LIVE
					</span>
				)}

				{/* Tool count */}
				<span style={{ fontSize: 10, color: C.textMuted }}>
					{turn.toolCalls.length} tool{turn.toolCalls.length !== 1 ? "s" : ""}
				</span>

				{/* Score */}
				{turn.avgScore != null && (
					<span
						style={{
							fontSize: 10,
							fontFamily: "monospace",
							color: scoreColor(turn.avgScore),
						}}
					>
						{turn.avgScore.toFixed(2)}
					</span>
				)}

				{!promptPreview && <div style={{ flex: 1 }} />}

				{/* Duration */}
				<span
					style={{ fontSize: 9, color: C.textMuted, fontFamily: "monospace" }}
				>
					{formatDuration(turn.start, turn.end)}
				</span>

				{/* Cost */}
				{turn.cost != null && (
					<span
						style={{ fontSize: 9, color: C.textMuted, fontFamily: "monospace" }}
					>
						{formatCost(turn.cost)}
					</span>
				)}

				{/* Time */}
				<span
					style={{ fontSize: 9, color: C.textMuted, fontFamily: "monospace" }}
				>
					{formatTime(turn.start)}
				</span>
			</button>

			{/* Body — expanded */}
			{expanded && (
				<div
					style={{
						padding: "6px 14px 10px",
						borderTop: `1px solid ${C.border}`,
					}}
				>
					{/* Preamble events (oracle calibration, turn_start, etc.) */}
					{preamble.map((e) => (
						<MiniEvent key={`pre-${e.ts}-${e.plugin}-${e.type}`} event={e} />
					))}

					{/* Tool calls */}
					{turn.toolCalls.map((tc) => (
						<ToolCallGroup
							key={`tc-${tc.seq}`}
							toolCall={tc}
							defaultExpanded={turn.toolCalls.length <= 3}
						/>
					))}

					{/* Postamble events (cost_tracked / Stop) */}
					{postamble.map((e) => (
						<MiniEvent key={`post-${e.ts}-${e.plugin}-${e.type}`} event={e} />
					))}
				</div>
			)}
		</div>
	);
}
