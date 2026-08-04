"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { emptyStats } from "@/lib/stats";

/* ============================================================
   RideGuide Transit Poll
   Single-file React survey + results dashboard.
   Design direction: printed transit map. The progress bar is a
   route line, each question is a station, the marker is your vehicle.
   ============================================================ */

/* RideGuide brand tokens, matched to the marketing site */
const T = {
  ink: "#0E3B37",        // deep teal, headings and dark surfaces
  inkDeep: "#0A2E2B",    // pressed and footer teal
  paper: "#FAF7F2",      // warm cream page
  surface: "#FFFFFF",
  muted: "#5C716D",      // teal tinted grey
  hairline: "#DFD9CF",   // warm rule
  hairlineCool: "#CBDDD8",
  mint: "#A5E9D1",       // primary accent
  mintSoft: "#E4F6EF",   // selected fill
  green: "#12695C",      // positive
  orange: "#B4562A",     // warning, warm clay rather than a hot orange
  magenta: "#2F6F66",    // secondary teal for a third bar colour
};

const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap');

/* One typeface across the whole product, the way the marketing site does it.
   Display is the same family at a heavier weight with tighter tracking, and
   the old mono role becomes a wide tracked uppercase label. */
.rg-root { font-family: 'Figtree', system-ui, -apple-system, 'Segoe UI', sans-serif; font-feature-settings: 'cv11'; }
.rg-display { font-family: 'Figtree', system-ui, sans-serif; font-weight: 800; letter-spacing: -0.035em; }
.rg-label { font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.rg-num { font-weight: 700; letter-spacing: 0; font-variant-numeric: tabular-nums; }

.rg-root *:focus { outline: none; }
.rg-root *:focus-visible { outline: 3px solid ${T.ink}; outline-offset: 3px; border-radius: 8px; }

.rg-screen { animation: rg-in 320ms cubic-bezier(.22,.68,.28,1) both; }
@keyframes rg-in { from { opacity: 0; transform: translate3d(14px,0,0); } to { opacity: 1; transform: none; } }
.rg-screen-back { animation: rg-in-back 320ms cubic-bezier(.22,.68,.28,1) both; }
@keyframes rg-in-back { from { opacity: 0; transform: translate3d(-14px,0,0); } to { opacity: 1; transform: none; } }

.rg-marker { animation: rg-pulse 1.9s ease-in-out infinite; }
@keyframes rg-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(14,59,55,.30); } 50% { box-shadow: 0 0 0 7px rgba(14,59,55,0); } }

.rg-draw { stroke-dasharray: 420; stroke-dashoffset: 420; animation: rg-dash 1400ms cubic-bezier(.3,.7,.2,1) 120ms forwards; }
@keyframes rg-dash { to { stroke-dashoffset: 0; } }

.rg-card { transition: transform 140ms ease, border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease; }
.rg-card:hover { transform: translateY(-1px); }
.rg-card:active { transform: translateY(0) scale(.995); }

.rg-bar { transition: width 700ms cubic-bezier(.2,.7,.2,1); }

input[type=range].rg-range { -webkit-appearance: none; appearance: none; width: 100%; height: 44px; background: transparent; }
input[type=range].rg-range::-webkit-slider-runnable-track { height: 10px; border-radius: 999px; background: ${T.hairlineCool}; }
input[type=range].rg-range::-moz-range-track { height: 10px; border-radius: 999px; background: ${T.hairlineCool}; }
input[type=range].rg-range::-webkit-slider-thumb { -webkit-appearance: none; height: 40px; width: 40px; margin-top: -15px; border-radius: 999px; background: ${T.mint}; border: 5px solid ${T.ink}; cursor: grab; box-shadow: 0 2px 10px rgba(14,59,55,.20); }
input[type=range].rg-range::-moz-range-thumb { height: 34px; width: 34px; border-radius: 999px; background: ${T.mint}; border: 5px solid ${T.ink}; cursor: grab; }

.rg-live { animation: rg-blink 2s ease-in-out infinite; }
@keyframes rg-blink { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

.rg-new { animation: rg-pop 420ms cubic-bezier(.2,.9,.3,1.4) both; }
@keyframes rg-pop { from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .rg-screen, .rg-screen-back, .rg-marker, .rg-draw, .rg-bar, .rg-card, .rg-live, .rg-new { animation: none !important; transition: none !important; }
  .rg-draw { stroke-dashoffset: 0; }
}
`;

/* ---------------- content ---------------- */

const APPS = [
  { id: "google_maps", label: "Google Maps", mark: "G", tint: "#4285F4" },
  { id: "apple_maps", label: "Apple Maps", mark: "", tint: "#1D1D1F" },
  { id: "transit_app", label: "Transit", mark: "T", tint: "#00A08A" },
  { id: "citymapper", label: "Citymapper", mark: "C", tint: "#0A9E4E" },
  { id: "moovit", label: "Moovit", mark: "M", tint: "#F26722" },
  { id: "agency_app", label: "My transit agency's own app", mark: "A", tint: "#0E3B37" },
  { id: "rideshare", label: "Uber or Lyft, for transit connections", mark: "U", tint: "#1D1D1F" },
  { id: "other_app", label: "Something else", mark: "?", tint: "#5C716D" },
  { id: "no_app", label: "I don't really use a transit app", mark: "\u2014", tint: "#5C716D", exclusive: true },
];

const appLabel = (id) => (APPS.find((a) => a.id === id) || { label: "your app" }).label;

const IMPROVEMENTS = [
  { id: "accurate_arrivals", label: "More accurate arrival predictions" },
  { id: "early_warnings", label: "Earlier delay and cancellation warnings" },
  { id: "better_alternates", label: "Better backup routes when things break" },
  { id: "cleaner_ui", label: "A simpler, cleaner interface" },
  { id: "fewer_ads", label: "Fewer ads" },
  { id: "fare_clarity", label: "Clear fare and payment info" },
  { id: "accessibility", label: "Better accessibility support" },
  { id: "live_tracking", label: "More reliable live vehicle tracking" },
  { id: "transfers", label: "Better transfer instructions" },
  { id: "personal_alerts", label: "Personalized alerts for my usual trips" },
  { id: "crowding_info", label: "Crowding info before I board" },
  { id: "safety_info", label: "Safety information" },
  { id: "multi_agency_support", label: "Several transit agencies in one app" },
  { id: "multimodal", label: "Walking, cycling, rideshare and driving in one plan" },
  { id: "ai_assistant", label: "An assistant that explains why my route changed" },
];

const impLabel = (id) => (IMPROVEMENTS.find((i) => i.id === id) || { label: id }).label;

const NO_APP_REASONS = [
  { id: "know_routes", label: "I already know my routes" },
  { id: "signs_schedules", label: "I use posted schedules and station signs" },
  { id: "agency_website", label: "I check the transit agency website instead" },
  { id: "ask_or_wait", label: "I ask someone or just wait at the stop" },
  { id: "not_accurate", label: "The apps I tried were not accurate" },
  { id: "confusing", label: "The apps I tried were confusing to use" },
  { id: "ads_or_cost", label: "Too many ads, or they cost money" },
  { id: "phone_limits", label: "Phone storage, data or battery limits" },
  { id: "no_smartphone", label: "I do not have a smartphone or a data plan" },
  { id: "other_no_app", label: "Something else" },
];

const QUESTIONS = [
  {
    id: "frequency",
    kind: "single",
    eyebrow: "How you travel",
    title: "How often do you take public transit?",
    sub: "Pick the answer closest to a normal month for you.",
    secs: 12,
    options: [
      { id: "daily", label: "Almost every day" },
      { id: "weekly", label: "A few times a week" },
      { id: "monthly", label: "A few times a month" },
      { id: "occasional", label: "Occasionally" },
      { id: "rarely", label: "Rarely" },
    ],
  },
  {
    id: "agencies",
    kind: "multi",
    eyebrow: "How you travel",
    title: "Which transit systems do you ride?",
    sub: "Select all that apply. If you ride outside the Greater Toronto Area, pick the last option.",
    secs: 15,
    options: [
      { id: "ttc", label: "TTC" },
      { id: "go", label: "GO Transit" },
      { id: "miway", label: "MiWay (Mississauga)" },
      { id: "brampton", label: "Brampton Transit or Z\u00fcm" },
      { id: "yrt", label: "YRT or Viva" },
      { id: "other_gta", label: "Another GTA system (Durham, Oakville, Burlington)" },
      { id: "outside_gta", label: "A system outside the Greater Toronto Area" },
    ],
  },
  {
    id: "apps",
    kind: "multi",
    eyebrow: "Apps you use",
    title: "Which apps have you used to plan a transit trip in the last six months?",
    sub: "Select all that apply.",
    secs: 20,
    options: APPS.map((a) => ({ id: a.id, label: a.label, mark: a.mark, tint: a.tint, exclusive: a.exclusive })),
  },
  {
    id: "primary_app",
    kind: "single",
    eyebrow: "Apps you use",
    title: "Which app do you use the most?",
    sub: "Pick the one you open most often for transit.",
    secs: 12,
    dynamic: "primary",
    skipIf: (a) => (a.apps || []).filter((x) => x !== "no_app").length < 2,
  },
  {
    id: "no_app_reason",
    kind: "single",
    eyebrow: "Apps you use",
    title: "Why don't you use a transit app?",
    sub: "Pick the main reason.",
    secs: 15,
    options: NO_APP_REASONS,
    skipIf: (a) => !noApp(a),
  },
  {
    id: "rating",
    kind: "slider",
    eyebrow: "Your main app",
    title: "Overall, how well does your main app work for you?",
    sub: "Drag the slider. 1 means it makes travelling harder, 10 means you completely trust it.",
    secs: 18,
    skipIf: (a) => noApp(a),
  },
  {
    id: "frustrations",
    kind: "multi",
    max: 5,
    eyebrow: "Problems",
    title: "What frustrates you most about transit apps?",
    sub: "Pick up to five.",
    secs: 35,
    options: [
      { id: "wrong_arrivals", label: "Arrival times are wrong" },
      { id: "late_delays", label: "Delays show up too late to help" },
      { id: "hidden_cancellations", label: "Cancelled trips aren't clearly shown" },
      { id: "bad_live", label: "Live vehicle locations are off" },
      { id: "confusing_routes", label: "Routes are confusing" },
      { id: "bad_transfers", label: "Transfer instructions are vague" },
      { id: "no_explanation", label: "It never explains why a route changed" },
      { id: "no_fares", label: "Missing fare and payment info" },
      { id: "weak_accessibility", label: "Weak accessibility info" },
      { id: "no_crowding", label: "No idea how full the vehicle will be" },
      { id: "multi_agency_gaps", label: "Weak when a trip crosses two transit systems" },
      { id: "ads", label: "Too many ads" },
      { id: "paywall", label: "Useful features are behind a paywall" },
      { id: "clutter", label: "Cluttered or confusing interface" },
      { id: "notifications", label: "Too many notifications" },
      { id: "battery", label: "Eats battery or data" },
      { id: "other_frustration", label: "Something else" },
    ],
  },
  {
    id: "improvements",
    kind: "rank",
    eyebrow: "What matters most",
    title: "Which improvements to transit apps matter most to you?",
    sub: "Pick five, then put them in order. Number 1 is the most important.",
    secs: 60,
  },
  {
    id: "one_fix",
    kind: "text",
    optional: true,
    eyebrow: "Last question",
    title: "If you could fix one thing about transit apps, what would it be?",
    sub: "Anything at all. Skip this one if you would rather not answer.",
    placeholder: "The one change that would make your trips easier\u2026",
    secs: 35,
  },
];

function noApp(a) {
  const used = (a.apps || []).filter((x) => x !== "no_app");
  return used.length === 0;
}

/* ---------------- storage ----------------
   Progress and the unlock flag live in the visitor's browser.
   Responses and results go through the API routes, so the service role
   key stays on the server and no raw response is ever exposed.
*/

const PROGRESS_KEY = "rideguide:poll:progress:v1";
const UNLOCK_KEY = "rideguide:poll:completed:v1";

const readLocal = (k) => {
  try {
    return window.localStorage.getItem(k);
  } catch (e) {
    return null;
  }
};
const writeLocal = (k, v) => {
  try {
    window.localStorage.setItem(k, v);
  } catch (e) {
    /* private mode, or storage is full */
  }
};
const dropLocal = (k) => {
  try {
    window.localStorage.removeItem(k);
  } catch (e) {
    /* nothing to clear */
  }
};

async function saveProgress(payload) {
  writeLocal(PROGRESS_KEY, JSON.stringify(payload));
}
async function loadProgress() {
  const raw = readLocal(PROGRESS_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
async function clearProgress() {
  dropLocal(PROGRESS_KEY);
}
async function markCompleted() {
  writeLocal(UNLOCK_KEY, "1");
}
async function loadCompleted() {
  return readLocal(UNLOCK_KEY) === "1";
}

async function submitResponse(record) {
  const res = await fetch("/api/responses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error("submit failed with " + res.status);
  return res.json();
}

/* the server recounts from Postgres on every call, so there is no
   running tally to drift and Recount is the same request */
async function readStats() {
  const res = await fetch("/api/results", { cache: "no-store" });
  if (!res.ok) throw new Error("results failed with " + res.status);
  return res.json();
}
const rebuildStats = readStats;

/* ---------------- small pieces ---------------- */

/* the diamond in a circle from the site header */
function Logo({ size = 30, onDark }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, borderRadius: 999, background: onDark ? T.mint : T.ink, display: "inline-grid", placeItems: "center", flex: "0 0 auto" }}
    >
      <span
        style={{
          width: size * 0.34,
          height: size * 0.34,
          background: onDark ? T.ink : T.mint,
          transform: "rotate(45deg)",
          borderRadius: size * 0.06,
        }}
      />
    </span>
  );
}

function Wordmark({ onDark }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <Logo onDark={onDark} />
      <span style={{ lineHeight: 1 }}>
        <span className="rg-display" style={{ display: "block", fontSize: 19, color: onDark ? "#fff" : T.ink }}>
          RideGuide
        </span>
        <span className="rg-label" style={{ display: "block", fontSize: 8.5, color: onDark ? T.mint : T.muted, marginTop: 3 }}>
          Rider research
        </span>
      </span>
    </span>
  );
}

function Eyebrow({ children }) {
  return (
    <div className="rg-label" style={{ fontSize: 11, color: T.green }}>
      {children}
    </div>
  );
}

function Check({ on, shape = "box" }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: "0 0 auto",
        width: 24,
        height: 24,
        borderRadius: shape === "dot" ? 999 : 7,
        border: `2px solid ${on ? T.ink : T.hairline}`,
        background: on ? T.ink : T.surface,
        display: "grid",
        placeItems: "center",
        color: "#fff",
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {on ? (shape === "dot" ? "\u2022" : "\u2713") : ""}
    </span>
  );
}

function OptionCard({ selected, disabled, onClick, label, badge, mark, tint, hint, shape }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className="rg-card"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        padding: "14px 14px",
        minHeight: 60,
        borderRadius: 14,
        border: `2px solid ${selected ? T.ink : T.hairline}`,
        background: selected ? T.mintSoft : T.surface,
        color: disabled ? T.muted : T.ink,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: selected ? `inset 5px 0 0 ${T.mint}` : "none",
        font: "inherit",
      }}
    >
      <Check on={!!selected} shape={shape} />
      {mark !== undefined && mark !== null ? (
        <span
          className="rg-num"
          aria-hidden="true"
          style={{
            flex: "0 0 auto",
            width: 30,
            height: 30,
            borderRadius: 9,
            background: tint || T.ink,
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {mark}
        </span>
      ) : null}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 16, fontWeight: selected ? 700 : 500, lineHeight: 1.25 }}>{label}</span>
        {hint ? <span style={{ display: "block", fontSize: 13, color: T.muted, marginTop: 2 }}>{hint}</span> : null}
      </span>
      {badge ? (
        <span
          className="rg-num"
          style={{
            flex: "0 0 auto",
            minWidth: 28,
            height: 28,
            padding: "0 8px",
            borderRadius: 999,
            background: T.ink,
            color: T.mint,
            display: "grid",
            placeItems: "center",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled, tone = "blue" }) {
  const bg = disabled ? "#CFCCC4" : tone === "green" ? T.green : T.ink;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rg-display"
      style={{
        width: "100%",
        minHeight: 54,
        borderRadius: 14,
        border: "none",
        background: bg,
        color: disabled ? "#8C8A84" : T.mint,
        fontSize: 19,
        fontWeight: 700,
        letterSpacing: "-.01em",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 140ms ease",
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 44,
        padding: "0 14px",
        borderRadius: 12,
        border: `1.5px solid ${T.hairline}`,
        background: "transparent",
        color: T.ink,
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
        font: "inherit",
      }}
    >
      {children}
    </button>
  );
}

/* the signature element: a route line where each station is a question */
function RouteRail({ flow, step, onJump, minutesLeft }) {
  return (
    <div style={{ padding: "10px 16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span className="rg-label" style={{ fontSize: 10, color: T.ink }}>
          Stop {step + 1} of {flow.length}
        </span>
        <span className="rg-label" style={{ fontSize: 10, color: T.muted }}>
          {minutesLeft <= 1 ? "under a min left" : "~" + minutesLeft + " min left"}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={flow.length}
        aria-valuenow={step + 1}
        aria-label={"Question " + (step + 1) + " of " + flow.length}
        style={{ position: "relative", height: 18, display: "flex", alignItems: "center" }}
      >
        <div style={{ position: "absolute", left: 4, right: 4, height: 4, borderRadius: 999, background: T.hairlineCool }} />
        <div
          className="rg-bar"
          style={{
            position: "absolute",
            left: 4,
            height: 4,
            borderRadius: 999,
            background: T.ink,
            width: `calc((100% - 8px) * ${flow.length > 1 ? step / (flow.length - 1) : 1})`,
          }}
        />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", width: "100%" }}>
          {flow.map((q, i) => {
            const done = i < step;
            const here = i === step;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => (i <= step ? onJump(i) : null)}
                aria-label={(here ? "Current: " : done ? "Go back to: " : "Upcoming: ") + q.title}
                aria-current={here ? "step" : undefined}
                disabled={i > step}
                className={here ? "rg-marker" : undefined}
                style={{
                  width: here ? 18 : 12,
                  height: here ? 18 : 12,
                  padding: 0,
                  borderRadius: 999,
                  border: `2px solid ${done || here ? T.ink : T.hairlineCool}`,
                  background: done ? T.ink : here ? T.mint : T.paper,
                  cursor: i <= step ? "pointer" : "default",
                  transition: "all 200ms ease",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- welcome + done ---------------- */

function Welcome({ onStart, hasSaved, onResume }) {
  return (
    <div className="rg-screen">
      <div style={{ padding: "18px 20px 0" }}>
        <Wordmark />
      </div>

      {/* the dark teal hero, straight off the marketing site */}
      <div style={{ margin: "16px 12px 0", background: T.ink, borderRadius: 24, padding: "26px 22px 28px", color: "#fff" }}>
        <span
          className="rg-label"
          style={{ display: "inline-block", fontSize: 10, color: T.mint, border: `1.5px solid rgba(165,233,209,.35)`, borderRadius: 999, padding: "7px 13px" }}
        >
          {"\u25c6"} Two minutes of your time
        </span>

        <h1 className="rg-display" style={{ fontSize: 44, lineHeight: 0.97, margin: "18px 0 14px", color: "#fff" }}>
          The calmer way<br />to get there<span style={{ color: T.mint }}>.</span>
        </h1>

        <p style={{ fontSize: 16.5, lineHeight: 1.5, color: "rgba(255,255,255,.78)", margin: "0 0 22px", maxWidth: 430 }}>
          Transit apps are supposed to make getting around easier. Sometimes they do the opposite. Tell us what works,
          what drives you up the wall, and what your ideal transit app would actually do.
        </p>

        <svg viewBox="0 0 320 54" width="100%" height="50" aria-hidden="true" style={{ display: "block", marginBottom: 22 }}>
          <path className="rg-draw" d="M8 40 L74 40 L106 14 L206 14 L238 40 L312 40" fill="none" stroke={T.mint} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="8" cy="40" r="6" fill={T.ink} stroke={T.mint} strokeWidth="4" />
          <circle cx="106" cy="14" r="5" fill={T.mint} />
          <circle cx="206" cy="14" r="5" fill={T.mint} />
          <circle cx="312" cy="40" r="8" fill={T.mint} />
        </svg>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, borderTop: "1px solid rgba(255,255,255,.16)", paddingTop: 18 }}>
          {[
            ["8", "questions", "one optional"],
            ["3", "minutes", "about that"],
            ["0", "accounts", "nothing to sign up for"],
          ].map(([n, k, v]) => (
            <div key={k}>
              <div className="rg-display" style={{ fontSize: 26, color: T.mint, lineHeight: 1 }}>
                {n} {k}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.62)", marginTop: 5, lineHeight: 1.3 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        {hasSaved ? (
          <div style={{ display: "grid", gap: 10 }}>
            <PrimaryButton onClick={onResume}>Pick up where you left off</PrimaryButton>
            <GhostButton onClick={onStart}>Start over</GhostButton>
          </div>
        ) : (
          <PrimaryButton onClick={onStart}>Start {"\u2192"}</PrimaryButton>
        )}

        <p style={{ fontSize: 13, color: T.muted, marginTop: 16, lineHeight: 1.5 }}>
          Answers are anonymous and shape what RideGuide gets built next. Your progress stays on this device, so you can
          close the tab and come back.
        </p>
      </div>
    </div>
  );
}

function Done({ answers, onDashboard, onRestart, saveState, myNumber }) {
  const top = (answers.improvements || [])[0];
  return (
    <div className="rg-screen" style={{ padding: "36px 20px" }}>
      <svg viewBox="0 0 320 70" width="100%" height="64" aria-hidden="true" style={{ display: "block", marginBottom: 14 }}>
        <path className="rg-draw" d="M8 50 L120 50 L170 18 L312 18" fill="none" stroke={T.ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="312" cy="18" r="10" fill={T.mint} stroke={T.ink} strokeWidth="4" />
      </svg>
      <Eyebrow>Last stop</Eyebrow>
      <h1 className="rg-display" style={{ fontSize: 40, lineHeight: 1, margin: "8px 0 10px" }}>
        That's it. Thank you<span style={{ color: T.green }}>.</span>
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.5, color: T.muted, marginTop: 0 }}>
        {top
          ? `You put "${impLabel(top)}" at the top of the list. That goes straight into what we build next.`
          : "Every answer feeds directly into what we build next."}
      </p>
      <p className="rg-label" style={{ fontSize: 10, color: saveState === "error" ? T.orange : T.muted, marginBottom: 22 }}>
        {saveState === "saving"
          ? "saving your response\u2026"
          : saveState === "error"
          ? "could not save to the shared results, your answers stayed on this device"
          : myNumber
          ? "response " + myNumber + " recorded"
          : "response recorded"}
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        <PrimaryButton tone="green" onClick={onDashboard}>
          See what everyone else said
        </PrimaryButton>
        <GhostButton onClick={onRestart}>Take it again</GhostButton>
      </div>
    </div>
  );
}

/* ---------------- question renderers ---------------- */

function SingleQ({ q, value, onChange, options }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {options.map((o) => (
        <OptionCard
          key={o.id}
          shape="dot"
          selected={value === o.id}
          label={o.label}
          mark={o.mark}
          tint={o.tint}
          onClick={() => onChange(o.id)}
        />
      ))}
    </div>
  );
}

function MultiQ({ q, options, value = [], onChange }) {
  const opts = options && options.length ? options : q.options;
  const max = q.max;
  const full = max ? value.length >= max : false;
  const toggle = (o) => {
    const on = value.includes(o.id);
    if (on) return onChange(value.filter((v) => v !== o.id));
    if (o.exclusive) return onChange([o.id]);
    const cleaned = value.filter((v) => !(opts.find((x) => x.id === v) || {}).exclusive);
    if (max && cleaned.length >= max) return;
    onChange([...cleaned, o.id]);
  };
  return (
    <div>
      {max ? (
        <div className="rg-label" style={{ fontSize: 10, color: full ? T.orange : T.muted, marginBottom: 10 }}>
          {value.length} of {max} selected{full ? ". Tap a selected one to swap it out." : ""}
        </div>
      ) : null}
      <div style={{ display: "grid", gap: 10 }}>
        {opts.map((o) => {
          const on = value.includes(o.id);
          return (
            <OptionCard
              key={o.id}
              selected={on}
              disabled={!on && full && !o.exclusive}
              label={o.label}
              mark={o.mark}
              tint={o.tint}
              onClick={() => toggle(o)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SliderQ({ value, onChange, appName }) {
  const v = value == null ? 5 : value;
  const caption =
    v <= 2 ? "It makes travelling harder" : v <= 4 ? "More trouble than help" : v <= 6 ? "It gets the job done" : v <= 8 ? "It works well most of the time" : "I completely trust it";
  const tint = v <= 3 ? T.orange : v <= 6 ? T.ink : T.green;
  return (
    <div>
      <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
        <div className="rg-display" style={{ fontSize: 76, fontWeight: 700, lineHeight: 1, color: tint }}>
          {v}
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>{caption}</div>
        <div style={{ fontSize: 14, color: T.muted, marginTop: 2 }}>on {appName}</div>
      </div>
      <input
        className="rg-range"
        type="range"
        min="1"
        max="10"
        step="1"
        value={v}
        aria-label={"Rate " + appName + " from 1 to 10"}
        aria-valuetext={v + " out of 10, " + caption}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="rg-label" style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: T.muted }}>
        <span>1 MAKES IT HARDER</span>
        <span>5 DOES THE JOB</span>
        <span>10 FULLY TRUST IT</span>
      </div>
    </div>
  );
}

/* tap to rank, arrows to reorder. no dragging, which is where mobile ranking usually falls apart */
function RankQ({ value = [], onChange }) {
  const MAXR = 5;
  const full = value.length >= MAXR;
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    const t = next[i];
    next[i] = next[j];
    next[j] = t;
    onChange(next);
  };
  return (
    <div>
      <div style={{ background: full ? T.mintSoft : T.surface, border: `2px solid ${full ? T.ink : T.hairline}`, borderRadius: 16, padding: 12, marginBottom: 14 }}>
        <div className="rg-label" style={{ fontSize: 10, color: full ? T.green : T.muted, marginBottom: 8 }}>
          Your top five {value.length}/{MAXR}
        </div>
        {value.length === 0 ? (
          <p style={{ margin: 0, color: T.muted, fontSize: 15 }}>Nothing picked yet. Tap five from the list below.</p>
        ) : (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {value.map((id, i) => (
              <li key={id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  className="rg-num"
                  style={{ width: 28, height: 28, borderRadius: 8, background: T.ink, color: i === 0 ? T.mint : "rgba(165,233,209,.65)", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, flex: "0 0 auto" }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>{impLabel(id)}</span>
                <button type="button" aria-label={"Move " + impLabel(id) + " up"} disabled={i === 0} onClick={() => move(i, -1)} style={arrowStyle(i === 0)}>
                  {"\u2191"}
                </button>
                <button type="button" aria-label={"Move " + impLabel(id) + " down"} disabled={i === value.length - 1} onClick={() => move(i, 1)} style={arrowStyle(i === value.length - 1)}>
                  {"\u2193"}
                </button>
                <button type="button" aria-label={"Remove " + impLabel(id)} onClick={() => onChange(value.filter((x) => x !== id))} style={arrowStyle(false)}>
                  {"\u00d7"}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {IMPROVEMENTS.map((o) => {
          const idx = value.indexOf(o.id);
          const on = idx >= 0;
          return (
            <OptionCard
              key={o.id}
              selected={on}
              disabled={!on && full}
              badge={on ? idx + 1 : null}
              label={o.label}
              onClick={() => (on ? onChange(value.filter((x) => x !== o.id)) : full ? null : onChange([...value, o.id]))}
            />
          );
        })}
      </div>
    </div>
  );
}

function arrowStyle(disabled) {
  return {
    width: 38,
    height: 38,
    flex: "0 0 auto",
    borderRadius: 10,
    border: `1.5px solid ${T.hairline}`,
    background: T.surface,
    color: disabled ? T.hairline : T.ink,
    fontSize: 17,
    cursor: disabled ? "default" : "pointer",
  };
}

function TextQ({ q, value = "", onChange }) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 600))}
        placeholder={q.placeholder}
        rows={6}
        aria-label={q.sub}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 14,
          fontSize: 16,
          lineHeight: 1.45,
          borderRadius: 14,
          border: `2px solid ${value ? T.ink : T.hairline}`,
          background: T.surface,
          color: T.ink,
          resize: "vertical",
          font: "inherit",
          fontFamily: "inherit",
        }}
      />
      <div className="rg-label" style={{ fontSize: 9.5, color: T.muted, textAlign: "right", marginTop: 6 }}>
        {600 - (value || "").length} characters left
      </div>
    </div>
  );
}

/* ---------------- dashboard ---------------- */

function Bar({ label, count, total, tint }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, marginBottom: 4 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ color: T.muted, flex: "0 0 auto", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: T.paper, overflow: "hidden" }}>
        <div className="rg-bar" style={{ height: "100%", width: pct + "%", background: tint || T.ink, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function Panel({ title, note, children }) {
  return (
    <section style={{ background: T.surface, borderRadius: 16, border: `1.5px solid ${T.hairline}`, padding: 16, marginBottom: 14 }}>
      <h3 className="rg-display" style={{ fontSize: 21, margin: "0 0 4px" }}>
        {title}
      </h3>
      {note ? <p style={{ fontSize: 12.5, color: T.muted, margin: "0 0 12px", lineHeight: 1.35 }}>{note}</p> : <div style={{ height: 10 }} />}
      {children}
    </section>
  );
}

const sortEntries = (m) => Object.entries(m || {}).sort((x, y) => y[1] - x[1]);

function timeAgo(iso) {
  if (!iso) return "";
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 45) return "just now";
  if (secs < 3600) return Math.round(secs / 60) + " min ago";
  if (secs < 86400) return Math.round(secs / 3600) + " h ago";
  return Math.round(secs / 86400) + " d ago";
}

function LiveStatus({ status, lastAt, fresh, onRefresh, tick }) {
  const secs = lastAt ? Math.round((tick - lastAt) / 1000) : null;
  const colour = status === "error" ? T.orange : status === "live" ? T.green : T.muted;
  const text =
    status === "error"
      ? "not updating, tap to retry"
      : status === "rebuilding"
      ? "recounting from responses"
      : status === "loading"
      ? "loading"
      : secs === null
      ? "live"
      : secs < 5
      ? "updated just now"
      : "updated " + secs + "s ago";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
      <span
        className="rg-label"
        style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, color: colour }}
      >
        <span className={status === "live" ? "rg-live" : undefined} style={{ width: 8, height: 8, borderRadius: 999, background: colour, display: "inline-block" }} />
        {text}
      </span>
      {fresh > 0 ? (
        <span className="rg-new" style={{ fontSize: 11.5, fontWeight: 700, color: T.ink, background: T.mint, borderRadius: 999, padding: "4px 10px" }}>
          +{fresh} since you opened this
        </span>
      ) : null}
      <button
        type="button"
        onClick={onRefresh}
        style={{ marginLeft: "auto", minHeight: 36, padding: "0 12px", borderRadius: 10, border: `1.5px solid ${T.hairline}`, background: T.surface, color: T.ink, fontSize: 13, fontWeight: 600, cursor: "pointer", font: "inherit" }}
      >
        Recount
      </button>
    </div>
  );
}

function Dashboard({ onBack, myNumber }) {
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("loading");
  const [lastAt, setLastAt] = useState(null);
  const [fresh, setFresh] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const baseline = useRef(null);
  const alive = useRef(true);

  const pull = useCallback(async (opts) => {
    const force = opts && opts.force;
    try {
      if (force) setStatus("rebuilding");
      let s = force ? await rebuildStats() : await readStats();
      if (!s) {
        setStatus("rebuilding");
        s = await rebuildStats();
      }
      if (!alive.current) return;
      setStats(s);
      setLastAt(Date.now());
      setStatus("live");
      if (baseline.current === null) baseline.current = s.n;
      else setFresh(Math.max(0, s.n - baseline.current));
    } catch (e) {
      if (alive.current) setStatus("error");
    }
  }, []);

  /* poll while the tab is visible, stop while it is not, catch up on return */
  useEffect(() => {
    alive.current = true;
    pull();
    let id = setInterval(() => {
      if (!document.hidden) pull();
    }, 10000);
    const onVis = () => {
      if (!document.hidden) pull();
    };
    document.addEventListener("visibilitychange", onVis);
    const clock = setInterval(() => setTick(Date.now()), 1000);
    return () => {
      alive.current = false;
      clearInterval(id);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pull]);

  const d = stats || emptyStats();
  const n = d.n;

  const avg = d.rating_n ? (d.rating_sum / d.rating_n).toFixed(1) : "\u2014";
  const lowPct = d.rating_n ? Math.round((d.rating_low / d.rating_n) * 100) : 0;
  const appCounts = sortEntries(d.apps).filter(([id]) => id !== "no_app");
  const frustration = sortEntries(d.frustrations);
  const freq = sortEntries(d.frequency);
  const features = sortEntries(d.features).slice(0, 8);
  const featureMax = features.length ? features[0][1] : 1;
  const byApp = Object.entries(d.primary || {})
    .map(([k, v]) => [k, v.sum / v.n, v.n])
    .sort((x, y) => y[1] - x[1]);

  return (
    <div className="rg-screen" style={{ padding: "20px 16px 40px" }}>
      <button type="button" onClick={onBack} style={{ ...arrowStyle(false), width: "auto", padding: "0 12px", marginBottom: 14, fontSize: 14, fontWeight: 600, height: 40, font: "inherit" }}>
        {"\u2190 Back to the poll"}
      </button>
      <Eyebrow>Live results</Eyebrow>
      <h1 className="rg-display" style={{ fontSize: 36, margin: "6px 0 6px", lineHeight: 1 }}>
        What riders are telling us
      </h1>
      <p style={{ fontSize: 15, color: T.muted, margin: "0 0 10px" }}>
        {n === 0 ? "No responses yet." : n + " response" + (n === 1 ? "" : "s") + " so far."}
        {myNumber ? " You were number " + myNumber + "." : ""}
      </p>

      <LiveStatus status={status} lastAt={lastAt} fresh={fresh} tick={tick} onRefresh={() => pull({ force: true })} />

      {n === 0 ? (
        <div style={{ background: T.surface, border: `2px dashed ${T.hairline}`, borderRadius: 16, padding: 22, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 16, color: T.muted }}>Responses land here within seconds of being submitted.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 14 }}>
            <div style={{ background: T.ink, color: T.mint, borderRadius: 18, padding: 16 }}>
              <div className="rg-display" style={{ fontSize: 46, lineHeight: 1 }}>{avg}</div>
              <div className="rg-label" style={{ fontSize: 9.5, opacity: 0.72, marginTop: 6, lineHeight: 1.35 }}>
                avg trust score
              </div>
            </div>
            <div style={{ background: T.mint, color: T.ink, borderRadius: 18, padding: 16 }}>
              <div className="rg-display" style={{ fontSize: 46, lineHeight: 1 }}>{lowPct}%</div>
              <div className="rg-label" style={{ fontSize: 9.5, opacity: 0.72, marginTop: 6, lineHeight: 1.35 }}>
                rate their app 6 or lower
              </div>
            </div>
          </div>

          <Panel title="Coming in now" note="the last few responses, nothing identifying">
            {(d.recent || []).length === 0 ? (
              <p style={{ color: T.muted, fontSize: 14, margin: 0 }}>Nothing yet.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                {(d.recent || []).slice(0, 6).map((r, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 14, borderLeft: `3px solid ${i === 0 ? T.mint : T.hairline}`, paddingLeft: 10 }}>
                    <span style={{ flex: 1 }}>
                      {r.rating != null ? "Rated " + appLabel(r.primary_app) + " " + r.rating + "/10" : "Does not use a transit app"}
                      {r.top ? <span style={{ color: T.muted }}>{". Top ask: " + impLabel(r.top).toLowerCase()}</span> : null}
                    </span>
                    <span style={{ fontSize: 11.5, color: T.muted, flex: "0 0 auto", fontWeight: 600 }}>{timeAgo(r.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Apps in use" note="share of riders who used each app in the last six months">
            {appCounts.map(([id, c]) => (
              <Bar key={id} label={appLabel(id)} count={c} total={n} tint={(APPS.find((a) => a.id === id) || {}).tint} />
            ))}
          </Panel>

          <Panel title="Satisfaction by main app" note="average 1 to 10 rating, sample size in brackets">
            {byApp.length === 0 ? (
              <p style={{ color: T.muted, fontSize: 14, margin: 0 }}>No ratings yet.</p>
            ) : (
              byApp.map(([id, mean, count]) => (
                <div key={id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>
                      {appLabel(id)} <span style={{ color: T.muted, fontWeight: 400 }}>({count})</span>
                    </span>
                    <span style={{ color: T.muted, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{mean.toFixed(1)}</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: T.paper, overflow: "hidden" }}>
                    <div className="rg-bar" style={{ height: "100%", width: (mean / 10) * 100 + "%", background: mean >= 7 ? T.green : mean >= 5 ? T.ink : T.orange }} />
                  </div>
                </div>
              ))
            )}
          </Panel>

          <Panel title="Biggest frustrations" note="up to five per rider">
            {frustration.slice(0, 8).map(([id, c]) => (
              <Bar key={id} label={frustrationLabel(id)} count={c} total={n} tint={T.orange} />
            ))}
          </Panel>

          <Panel title="Most wanted features" note="weighted: first choice scores 5, fifth scores 1">
            {features.map(([id, sc]) => (
              <Bar key={id} label={impLabel(id)} count={sc} total={featureMax} tint={T.ink} />
            ))}
          </Panel>

          <Panel title="Who answered" note="how often they ride">
            {freq.map(([id, c]) => (
              <Bar key={id} label={findLabel("frequency", id)} count={c} total={n} tint={T.magenta} />
            ))}
            {d.no_app_users ? (
              <p style={{ fontSize: 13, color: T.muted, marginTop: 10, marginBottom: 0 }}>
                {d.no_app_users} of {n} use no transit app at all.
              </p>
            ) : null}
          </Panel>
        </>
      )}
    </div>
  );
}

const findLabel = (qid, oid) => {
  const q = QUESTIONS.find((x) => x.id === qid);
  const o = q && q.options ? q.options.find((x) => x.id === oid) : null;
  return o ? o.label : oid;
};
const frustrationLabel = (id) => findLabel("frustrations", id);

/* ---------------- app shell ---------------- */

export default function RideGuidePoll() {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(-1);
  const [view, setView] = useState("poll");
  const [dir, setDir] = useState(1);
  const [saved, setSaved] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [booted, setBooted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [teased, setTeased] = useState(false);
  const [myNumber, setMyNumber] = useState(null);
  const topRef = useRef(null);

  useEffect(() => {
    loadCompleted().then(setUnlocked);
    loadProgress().then((p) => {
      if (p && p.answers && Object.keys(p.answers).length) setSaved(p);
      setBooted(true);
    });
  }, []);

  const flow = useMemo(() => QUESTIONS.filter((q) => !(q.skipIf && q.skipIf(answers))), [answers]);
  const q = step >= 0 && step < flow.length ? flow[step] : null;

  const minutesLeft = useMemo(() => {
    const rest = flow.slice(Math.max(0, step)).reduce((s, x) => s + x.secs, 0);
    return Math.max(1, Math.round(rest / 60));
  }, [flow, step]);

  const set = useCallback((id, val) => setAnswers((a) => ({ ...a, [id]: val })), []);

  useEffect(() => {
    if (!booted || step < 0) return;
    saveProgress({ answers, step, at: Date.now() });
  }, [answers, step, booted]);

  useEffect(() => {
    if (topRef.current) topRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  /* keep primary_app honest: fill it in when there is only one candidate, drop it when it is no longer one */
  useEffect(() => {
    const used = (answers.apps || []).filter((x) => x !== "no_app");
    if (used.length === 1 && answers.primary_app !== used[0]) set("primary_app", used[0]);
    if (answers.primary_app && !used.includes(answers.primary_app)) set("primary_app", used.length === 1 ? used[0] : undefined);
  }, [answers.apps, answers.primary_app, set]);

  const primaryApp = useMemo(() => {
    if (answers.primary_app) return appLabel(answers.primary_app);
    const used = (answers.apps || []).filter((x) => x !== "no_app");
    return used.length === 1 ? appLabel(used[0]) : "your main app";
  }, [answers]);

  const options = useMemo(() => {
    if (!q) return [];
    if (q.dynamic === "primary") {
      return (answers.apps || []).filter((x) => x !== "no_app").map((id) => {
        const a = APPS.find((x) => x.id === id);
        return { id, label: a.label, mark: a.mark, tint: a.tint };
      });
    }
    return q.options || [];
  }, [q, answers]);

  const answered = useMemo(() => {
    if (!q) return false;
    const v = answers[q.id];
    if (q.optional) return true;
    if (q.kind === "multi") return Array.isArray(v) && v.length > 0;
    if (q.kind === "rank") return Array.isArray(v) && v.length === 5;
    if (q.kind === "slider") return true;
    return !!v;
  }, [q, answers]);

  const next = () => {
    setDir(1);
    if (step + 1 >= flow.length) return finish();
    setStep(step + 1);
  };
  const back = () => {
    setDir(-1);
    setStep(Math.max(0, step - 1));
  };

  const finish = async () => {
    setStep(flow.length);
    setSaveState("saving");
    setUnlocked(true);
    markCompleted();
    const record = {
      response_id: "r_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
      submitted_at: new Date().toISOString(),
      version: "poll_v1",
      ...answers,
      no_app_user: noApp(answers),
      completed: true,
    };
    try {
      const res = await submitResponse(record);
      if (res && res.n) setMyNumber(res.n);
      setSaveState("done");
    } catch (e) {
      setSaveState("error");
    }
    clearProgress();
  };

  const startFresh = () => {
    setAnswers({});
    setSaved(null);
    setStep(0);
    setDir(1);
  };
  const resume = () => {
    setAnswers(saved.answers);
    setStep(Math.min(saved.step, QUESTIONS.length - 1));
    setSaved(null);
    setDir(1);
  };

  const title = q ? q.title : "";
  const sub = q ? q.sub : "";

  const body = () => {
    if (!q) return null;
    const v = answers[q.id];
    switch (q.kind) {
      case "single":
        return <SingleQ q={q} options={options} value={v} onChange={(x) => set(q.id, x)} />;
      case "multi":
        return <MultiQ q={q} options={options} value={v} onChange={(x) => set(q.id, x)} />;
      case "slider":
        return <SliderQ value={v} appName={primaryApp} onChange={(x) => set(q.id, x)} />;
      case "rank":
        return <RankQ value={v} onChange={(x) => set(q.id, x)} />;
      case "text":
        return <TextQ q={q} value={v} onChange={(x) => set(q.id, x)} />;
      default:
        return null;
    }
  };

  return (
    <div className="rg-root" style={{ background: T.paper, color: T.ink, minHeight: "100vh", width: "100%" }}>
      {/* dangerouslySetInnerHTML because <style> is a raw-text element: SSR
          escapes text children (' -> &#x27;) but the browser never decodes
          entities inside <style>, so hydration sees mismatched text */}
      <style dangerouslySetInnerHTML={{ __html: FONT_CSS }} />
      <div
        ref={topRef}
        style={{ maxWidth: 560, margin: "0 auto", minHeight: "100vh", background: T.paper, position: "relative", overflowY: "auto" }}
      >
        {view === "dashboard" && unlocked ? (
          <Dashboard onBack={() => setView("poll")} myNumber={myNumber} />
        ) : step === -1 ? (
          <>
            <Welcome onStart={startFresh} hasSaved={!!saved} onResume={resume} />
            <div style={{ padding: "0 20px 30px", textAlign: "center" }}>
              {unlocked ? (
                <button type="button" onClick={() => setView("dashboard")} style={{ background: "none", border: "none", color: T.green, fontSize: 14, fontWeight: 700, textDecoration: "underline", cursor: "pointer", font: "inherit", minHeight: 44 }}>
                  View live results
                </button>
              ) : teased ? (
                <div
                  className="rg-screen"
                  role="status"
                  style={{ border: `2px dashed ${T.hairline}`, borderRadius: 14, padding: "16px 16px 14px", background: T.surface }}
                >
                  <div className="rg-label" style={{ fontSize: 10, color: T.orange }}>
                    {"\u25c6"} Locked
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.45, margin: "6px 0 12px", color: T.ink }}>
                    Finish the survey first. Results open up the moment you submit, and they stay open on this device.
                  </p>
                  <button
                    type="button"
                    onClick={() => (saved ? resume() : startFresh())}
                    style={{ background: "none", border: "none", color: T.green, fontSize: 15, fontWeight: 700, textDecoration: "underline", cursor: "pointer", font: "inherit", minHeight: 44, padding: 0 }}
                  >
                    {saved ? "Pick up where you left off" : "Start the survey"}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setTeased(true)} style={{ background: "none", border: "none", color: T.green, fontSize: 14, fontWeight: 700, textDecoration: "underline", cursor: "pointer", font: "inherit", minHeight: 44 }}>
                  View live results
                </button>
              )}
            </div>
          </>
        ) : step >= flow.length ? (
          <Done answers={answers} saveState={saveState} myNumber={myNumber} onDashboard={() => setView("dashboard")} onRestart={startFresh} />
        ) : (
          <>
            <div style={{ position: "sticky", top: 0, zIndex: 5, background: T.paper, borderBottom: `1px solid ${T.hairline}` }}>
              <RouteRail flow={flow} step={step} minutesLeft={minutesLeft} onJump={(i) => { setDir(-1); setStep(i); }} />
            </div>
            <div key={q.id} className={dir === 1 ? "rg-screen" : "rg-screen-back"} style={{ padding: "18px 16px 120px" }}>
              <div style={{ width: 34, height: 4, borderRadius: 999, background: T.mint, marginBottom: 12 }} />
              <Eyebrow>{q.eyebrow}</Eyebrow>
              <h2 className="rg-display" style={{ fontSize: 31, lineHeight: 1.04, margin: "8px 0 8px" }}>
                {title}
              </h2>
              <p style={{ fontSize: 16, color: T.muted, margin: "0 0 18px", lineHeight: 1.4 }}>
                {sub}
                {q.optional ? <span className="rg-label" style={{ color: T.green, fontSize: 10 }}> {"\u00b7"} Optional</span> : null}
              </p>
              {body()}
            </div>
            <div
              style={{
                position: "sticky",
                bottom: 0,
                background: "linear-gradient(to top, " + T.paper + " 72%, rgba(250,247,242,0))",
                padding: "14px 16px 18px",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <GhostButton onClick={back}>{"\u2190 Back"}</GhostButton>
              <div style={{ flex: 1 }}>
                <PrimaryButton onClick={next} disabled={!answered} tone={step === flow.length - 1 ? "green" : "blue"}>
                  {step === flow.length - 1 ? "Finish" : q.optional && !answers[q.id] ? "Skip" : "Continue"}
                </PrimaryButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
