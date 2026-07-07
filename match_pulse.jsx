import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

/* ---------------------------------------------------
   TOKENS
   pitch-dark   #0B3D2E   base background
   pitch-mid    #0E4535   stripe
   chalk        #F6F5F0   lines / primary text on dark
   home-amber   #FFB703   home team accent (floodlight)
   away-cyan    #4CC9F0   away team accent
   ink          #08140F   deep shadow / card bg
--------------------------------------------------- */

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');`;

const KEYFRAMES = `
@keyframes drawLine { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes popIn { from { opacity: 0; transform: scale(0.2); } to { opacity: 1; transform: scale(1); } }
@keyframes floodPulse { 0%,100% { opacity: 0.55; } 50% { opacity: 0.9; } }
`;

/* ---------------- DATA ----------------
   Schema is intentionally flat so it can be swapped for real
   Foot-Insights ETL output later:
   shot:  { team, x, y, targetY, xg, minute, outcome: goal|saved|off }
   pass:  { team, x1, y1, x2, y2, minute, type: key|progressive|normal, outcome: complete|incomplete }
   Pitch coords: 100 (length) x 64 (width). Home always attacks x->100, away attacks x->0.
----------------------------------------- */

const MATCHES = [
  {
    id: "m1",
    competition: "Premier League · Matchweek 24",
    home: { name: "Meridian United", short: "MER", score: 2, color: "#FFB703" },
    away: { name: "Harborview FC", short: "HAR", score: 1, color: "#4CC9F0" },
    stats: {
      possession: [58, 42],
      shots: [14, 9],
      onTarget: [6, 3],
      xg: [2.3, 1.1],
      passes: [10, 8],
      passAcc: [90, 88],
      keyPasses: [2, 2],
      corners: [7, 3],
    },
    shots: [
      { team: "home", x: 88, y: 30, targetY: 31, xg: 0.62, minute: 12, outcome: "goal" },
      { team: "home", x: 82, y: 40, targetY: 33, xg: 0.14, minute: 23, outcome: "saved" },
      { team: "home", x: 91, y: 34, targetY: 34, xg: 0.44, minute: 38, outcome: "goal" },
      { team: "home", x: 76, y: 20, targetY: 22, xg: 0.06, minute: 41, outcome: "off" },
      { team: "home", x: 85, y: 46, targetY: 30, xg: 0.28, minute: 57, outcome: "saved" },
      { team: "home", x: 95, y: 32, targetY: 32, xg: 0.51, minute: 63, outcome: "saved" },
      { team: "home", x: 70, y: 50, targetY: 45, xg: 0.05, minute: 70, outcome: "off" },
      { team: "home", x: 89, y: 28, targetY: 25, xg: 0.19, minute: 80, outcome: "off" },
      { team: "away", x: 12, y: 34, targetY: 32, xg: 0.55, minute: 30, outcome: "goal" },
      { team: "away", x: 18, y: 44, targetY: 42, xg: 0.11, minute: 49, outcome: "off" },
      { team: "away", x: 8, y: 30, targetY: 31, xg: 0.24, minute: 66, outcome: "saved" },
      { team: "away", x: 24, y: 20, targetY: 23, xg: 0.07, minute: 74, outcome: "off" },
      { team: "away", x: 15, y: 38, targetY: 33, xg: 0.13, minute: 85, outcome: "saved" },
    ],
    passes: {
      home: [
        { x1: 20, y1: 10, x2: 35, y2: 18, minute: 5, type: "normal", outcome: "complete" },
        { x1: 35, y1: 18, x2: 50, y2: 25, minute: 5, type: "progressive", outcome: "complete" },
        { x1: 50, y1: 25, x2: 68, y2: 20, minute: 11, type: "progressive", outcome: "complete" },
        { x1: 68, y1: 20, x2: 86, y2: 29, minute: 12, type: "key", outcome: "complete" },
        { x1: 15, y1: 50, x2: 32, y2: 44, minute: 22, type: "normal", outcome: "complete" },
        { x1: 32, y1: 44, x2: 55, y2: 48, minute: 22, type: "progressive", outcome: "incomplete" },
        { x1: 40, y1: 15, x2: 60, y2: 10, minute: 37, type: "normal", outcome: "complete" },
        { x1: 60, y1: 10, x2: 80, y2: 33, minute: 38, type: "key", outcome: "complete" },
        { x1: 25, y1: 30, x2: 45, y2: 35, minute: 56, type: "normal", outcome: "complete" },
        { x1: 45, y1: 35, x2: 70, y2: 40, minute: 56, type: "progressive", outcome: "complete" },
      ],
      away: [
        { x1: 80, y1: 20, x2: 65, y2: 25, minute: 28, type: "normal", outcome: "complete" },
        { x1: 65, y1: 25, x2: 48, y2: 30, minute: 28, type: "progressive", outcome: "complete" },
        { x1: 48, y1: 30, x2: 30, y2: 33, minute: 29, type: "progressive", outcome: "complete" },
        { x1: 30, y1: 33, x2: 13, y2: 34, minute: 30, type: "key", outcome: "complete" },
        { x1: 85, y1: 45, x2: 68, y2: 42, minute: 48, type: "normal", outcome: "incomplete" },
        { x1: 60, y1: 15, x2: 40, y2: 20, minute: 65, type: "normal", outcome: "complete" },
        { x1: 40, y1: 20, x2: 22, y2: 28, minute: 65, type: "progressive", outcome: "complete" },
        { x1: 22, y1: 28, x2: 9, y2: 30, minute: 66, type: "key", outcome: "complete" },
      ],
    },
    xgTimeline: [
      { minute: 0, home: 0, away: 0 }, { minute: 12, home: 0.62, away: 0 },
      { minute: 23, home: 0.76, away: 0 }, { minute: 30, home: 0.76, away: 0.55 },
      { minute: 38, home: 1.2, away: 0.55 }, { minute: 41, home: 1.26, away: 0.55 },
      { minute: 49, home: 1.26, away: 0.66 }, { minute: 57, home: 1.54, away: 0.66 },
      { minute: 63, home: 2.05, away: 0.66 }, { minute: 66, home: 2.05, away: 0.9 },
      { minute: 70, home: 2.1, away: 0.9 }, { minute: 74, home: 2.1, away: 0.97 },
      { minute: 80, home: 2.29, away: 0.97 }, { minute: 85, home: 2.29, away: 1.1 },
      { minute: 90, home: 2.3, away: 1.1 },
    ],
  },
  {
    id: "m2",
    competition: "La Liga · Jornada 31",
    home: { name: "Costa Real", short: "CRE", score: 3, color: "#FFB703" },
    away: { name: "Sierra Deportivo", short: "SIE", score: 3, color: "#4CC9F0" },
    stats: {
      possession: [49, 51],
      shots: [16, 15],
      onTarget: [8, 7],
      xg: [2.9, 2.7],
      passes: [12, 11],
      passAcc: [92, 91],
      keyPasses: [3, 3],
      corners: [5, 6],
    },
    shots: [
      { team: "home", x: 90, y: 32, targetY: 31, xg: 0.7, minute: 8, outcome: "goal" },
      { team: "home", x: 84, y: 42, targetY: 40, xg: 0.2, minute: 20, outcome: "off" },
      { team: "home", x: 92, y: 30, targetY: 33, xg: 0.55, minute: 44, outcome: "goal" },
      { team: "home", x: 78, y: 24, targetY: 30, xg: 0.1, minute: 52, outcome: "saved" },
      { team: "home", x: 87, y: 38, targetY: 34, xg: 0.33, minute: 61, outcome: "saved" },
      { team: "home", x: 96, y: 34, targetY: 32, xg: 0.61, minute: 78, outcome: "goal" },
      { team: "home", x: 70, y: 46, targetY: 44, xg: 0.08, minute: 85, outcome: "off" },
      { team: "away", x: 10, y: 30, targetY: 31, xg: 0.58, minute: 15, outcome: "goal" },
      { team: "away", x: 16, y: 40, targetY: 33, xg: 0.22, minute: 33, outcome: "saved" },
      { team: "away", x: 6, y: 34, targetY: 32, xg: 0.66, minute: 55, outcome: "goal" },
      { team: "away", x: 22, y: 22, targetY: 24, xg: 0.09, minute: 67, outcome: "off" },
      { team: "away", x: 12, y: 44, targetY: 34, xg: 0.4, minute: 73, outcome: "goal" },
      { team: "away", x: 28, y: 30, targetY: 26, xg: 0.12, minute: 88, outcome: "off" },
    ],
    passes: {
      home: [
        { x1: 18, y1: 12, x2: 34, y2: 20, minute: 3, type: "normal", outcome: "complete" },
        { x1: 34, y1: 20, x2: 52, y2: 15, minute: 3, type: "progressive", outcome: "complete" },
        { x1: 52, y1: 15, x2: 70, y2: 25, minute: 7, type: "progressive", outcome: "complete" },
        { x1: 70, y1: 25, x2: 88, y2: 32, minute: 8, type: "key", outcome: "complete" },
        { x1: 20, y1: 45, x2: 38, y2: 50, minute: 19, type: "normal", outcome: "complete" },
        { x1: 38, y1: 50, x2: 58, y2: 44, minute: 19, type: "progressive", outcome: "incomplete" },
        { x1: 45, y1: 10, x2: 65, y2: 18, minute: 43, type: "normal", outcome: "complete" },
        { x1: 65, y1: 18, x2: 90, y2: 30, minute: 44, type: "key", outcome: "complete" },
        { x1: 30, y1: 35, x2: 50, y2: 40, minute: 60, type: "normal", outcome: "complete" },
        { x1: 50, y1: 40, x2: 75, y2: 36, minute: 61, type: "progressive", outcome: "complete" },
        { x1: 55, y1: 20, x2: 78, y2: 28, minute: 77, type: "progressive", outcome: "complete" },
        { x1: 78, y1: 28, x2: 94, y2: 34, minute: 78, type: "key", outcome: "complete" },
      ],
      away: [
        { x1: 82, y1: 18, x2: 66, y2: 24, minute: 13, type: "normal", outcome: "complete" },
        { x1: 66, y1: 24, x2: 48, y2: 28, minute: 13, type: "progressive", outcome: "complete" },
        { x1: 48, y1: 28, x2: 28, y2: 32, minute: 14, type: "progressive", outcome: "complete" },
        { x1: 28, y1: 32, x2: 11, y2: 30, minute: 15, type: "key", outcome: "complete" },
        { x1: 80, y1: 48, x2: 62, y2: 44, minute: 31, type: "normal", outcome: "complete" },
        { x1: 62, y1: 44, x2: 44, y2: 38, minute: 32, type: "progressive", outcome: "incomplete" },
        { x1: 70, y1: 14, x2: 50, y2: 20, minute: 53, type: "normal", outcome: "complete" },
        { x1: 50, y1: 20, x2: 28, y2: 30, minute: 54, type: "progressive", outcome: "complete" },
        { x1: 28, y1: 30, x2: 7, y2: 34, minute: 55, type: "key", outcome: "complete" },
        { x1: 40, y1: 40, x2: 22, y2: 44, minute: 72, type: "normal", outcome: "complete" },
        { x1: 22, y1: 44, x2: 13, y2: 44, minute: 73, type: "key", outcome: "complete" },
      ],
    },
    xgTimeline: [
      { minute: 0, home: 0, away: 0 }, { minute: 8, home: 0.7, away: 0 },
      { minute: 15, home: 0.7, away: 0.58 }, { minute: 20, home: 0.9, away: 0.58 },
      { minute: 33, home: 0.9, away: 0.8 }, { minute: 44, home: 1.45, away: 0.8 },
      { minute: 52, home: 1.55, away: 0.8 }, { minute: 55, home: 1.55, away: 1.46 },
      { minute: 61, home: 1.88, away: 1.46 }, { minute: 67, home: 1.88, away: 1.55 },
      { minute: 73, home: 1.88, away: 1.95 }, { minute: 78, home: 2.49, away: 1.95 },
      { minute: 85, home: 2.57, away: 1.95 }, { minute: 88, home: 2.57, away: 2.07 },
      { minute: 90, home: 2.9, away: 2.7 },
    ],
  },
  {
    id: "m3",
    competition: "Champions League · Round of 16",
    home: { name: "Nordic Athletic", short: "NOR", score: 0, color: "#FFB703" },
    away: { name: "Vantage City", short: "VAN", score: 2, color: "#4CC9F0" },
    stats: {
      possession: [44, 56],
      shots: [8, 17],
      onTarget: [2, 9],
      xg: [0.6, 2.6],
      passes: [7, 12],
      passAcc: [86, 100],
      keyPasses: [1, 4],
      corners: [2, 8],
    },
    shots: [
      { team: "home", x: 82, y: 34, targetY: 24, xg: 0.12, minute: 27, outcome: "off" },
      { team: "home", x: 76, y: 44, targetY: 33, xg: 0.09, minute: 51, outcome: "saved" },
      { team: "home", x: 90, y: 30, targetY: 31, xg: 0.28, minute: 68, outcome: "saved" },
      { team: "home", x: 70, y: 22, targetY: 44, xg: 0.06, minute: 80, outcome: "off" },
      { team: "away", x: 14, y: 32, targetY: 31, xg: 0.48, minute: 22, outcome: "goal" },
      { team: "away", x: 8, y: 38, targetY: 33, xg: 0.31, minute: 35, outcome: "saved" },
      { team: "away", x: 18, y: 26, targetY: 24, xg: 0.15, minute: 40, outcome: "off" },
      { team: "away", x: 5, y: 34, targetY: 32, xg: 0.6, minute: 58, outcome: "goal" },
      { team: "away", x: 22, y: 44, targetY: 34, xg: 0.1, minute: 63, outcome: "saved" },
      { team: "away", x: 12, y: 30, targetY: 31, xg: 0.35, minute: 71, outcome: "saved" },
      { team: "away", x: 26, y: 38, targetY: 42, xg: 0.07, minute: 84, outcome: "off" },
    ],
    passes: {
      home: [
        { x1: 20, y1: 15, x2: 38, y2: 22, minute: 25, type: "normal", outcome: "complete" },
        { x1: 38, y1: 22, x2: 55, y2: 20, minute: 26, type: "progressive", outcome: "incomplete" },
        { x1: 25, y1: 45, x2: 42, y2: 40, minute: 49, type: "normal", outcome: "complete" },
        { x1: 42, y1: 40, x2: 60, y2: 35, minute: 50, type: "progressive", outcome: "complete" },
        { x1: 60, y1: 35, x2: 78, y2: 30, minute: 51, type: "key", outcome: "complete" },
        { x1: 30, y1: 20, x2: 50, y2: 18, minute: 67, type: "normal", outcome: "complete" },
        { x1: 50, y1: 18, x2: 70, y2: 25, minute: 68, type: "progressive", outcome: "complete" },
      ],
      away: [
        { x1: 78, y1: 20, x2: 60, y2: 25, minute: 18, type: "normal", outcome: "complete" },
        { x1: 60, y1: 25, x2: 42, y2: 30, minute: 19, type: "progressive", outcome: "complete" },
        { x1: 42, y1: 30, x2: 24, y2: 32, minute: 21, type: "progressive", outcome: "complete" },
        { x1: 24, y1: 32, x2: 13, y2: 32, minute: 22, type: "key", outcome: "complete" },
        { x1: 85, y1: 45, x2: 66, y2: 40, minute: 33, type: "normal", outcome: "complete" },
        { x1: 66, y1: 40, x2: 48, y2: 36, minute: 34, type: "progressive", outcome: "complete" },
        { x1: 48, y1: 36, x2: 28, y2: 30, minute: 35, type: "key", outcome: "complete" },
        { x1: 70, y1: 15, x2: 50, y2: 22, minute: 56, type: "normal", outcome: "complete" },
        { x1: 50, y1: 22, x2: 30, y2: 28, minute: 57, type: "progressive", outcome: "complete" },
        { x1: 30, y1: 28, x2: 12, y2: 30, minute: 58, type: "key", outcome: "complete" },
        { x1: 40, y1: 42, x2: 24, y2: 44, minute: 70, type: "normal", outcome: "complete" },
        { x1: 24, y1: 44, x2: 12, y2: 44, minute: 71, type: "key", outcome: "complete" },
      ],
    },
    xgTimeline: [
      { minute: 0, home: 0, away: 0 }, { minute: 22, home: 0, away: 0.48 },
      { minute: 27, home: 0.12, away: 0.48 }, { minute: 35, home: 0.12, away: 0.79 },
      { minute: 40, home: 0.12, away: 0.94 }, { minute: 51, home: 0.21, away: 0.94 },
      { minute: 58, home: 0.21, away: 1.54 }, { minute: 63, home: 0.21, away: 1.64 },
      { minute: 68, home: 0.49, away: 1.64 }, { minute: 71, home: 0.49, away: 1.99 },
      { minute: 80, home: 0.55, away: 1.99 }, { minute: 84, home: 0.55, away: 2.06 },
      { minute: 90, home: 0.6, away: 2.6 },
    ],
  },
];

const OUTCOME_META = {
  goal: { label: "Goal" },
  saved: { label: "Saved" },
  off: { label: "Off Target" },
};

function PitchBase() {
  return (
    <>
      <defs>
        <pattern id="stripes" width="12.5" height="64" patternUnits="userSpaceOnUse">
          <rect width="6.25" height="64" fill="#0B3D2E" />
          <rect x="6.25" width="6.25" height="64" fill="#0E4535" />
        </pattern>
        <pattern id="netLeft" width="2" height="2" patternUnits="userSpaceOnUse">
          <path d="M0,0 L2,2 M2,0 L0,2" stroke="#F6F5F0" strokeWidth="0.15" opacity="0.5" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100" height="64" fill="url(#stripes)" />
      <g stroke="#F6F5F0" strokeWidth="0.4" fill="none" opacity="0.75">
        <rect x="1" y="1" width="98" height="62" />
        <line x1="50" y1="1" x2="50" y2="63" />
        <circle cx="50" cy="32" r="8" />
        <circle cx="50" cy="32" r="0.6" fill="#F6F5F0" />
        <rect x="1" y="14" width="16" height="36" />
        <rect x="1" y="24" width="6" height="16" />
        <circle cx="11" cy="32" r="0.6" fill="#F6F5F0" />
        <path d="M 17 22 A 8 8 0 0 1 17 42" />
        <rect x="83" y="14" width="16" height="36" />
        <rect x="93" y="24" width="6" height="16" />
        <circle cx="89" cy="32" r="0.6" fill="#F6F5F0" />
        <path d="M 83 22 A 8 8 0 0 0 83 42" />
      </g>
      <rect x="-1.6" y="27" width="2.6" height="10" fill="url(#netLeft)" />
      <rect x="99" y="27" width="2.6" height="10" fill="url(#netLeft)" />
      <g stroke="#F6F5F0" strokeWidth="0.5" opacity="0.9">
        <line x1="0" y1="27" x2="0" y2="37" />
        <line x1="100" y1="27" x2="100" y2="37" />
      </g>
    </>
  );
}

function ShotLayer({ shots, home, away, selected, onSelect }) {
  return (
    <g>
      {shots.map((s, i) => {
        const color = s.team === "home" ? home.color : away.color;
        const r = 1.1 + s.xg * 3.2;
        const isSel = selected === i;
        const dimmed = selected !== null && !isSel;
        const isGoal = s.outcome === "goal";
        const isOff = s.outcome === "off";
        const lineOpacity = isOff ? 0.28 : isGoal ? 0.85 : 0.5;
        return (
          <g key={i} opacity={dimmed ? 0.22 : 1} style={{ transition: "opacity .2s" }}>
            <line
              x1={s.x} y1={s.y} x2={s.team === "home" ? 100 : 0} y2={s.targetY}
              stroke={color} strokeWidth={isGoal ? 0.6 : 0.35}
              strokeDasharray={isOff ? "1.5,1" : "1"}
              strokeDashoffset={isOff ? 0 : 1}
              opacity={lineOpacity}
              pathLength="1"
              style={{
                animation: isOff ? "none" : "drawLine .7s ease forwards",
                animationDelay: `${i * 0.04}s`,
              }}
            />
            <g
              onClick={() => onSelect(isSel ? null : i)}
              className="cursor-pointer"
              style={{ animation: "popIn .35s ease forwards", animationDelay: `${i * 0.04}s`, opacity: 0 }}
            >
              <circle cx={s.x} cy={s.y} r={r} fill={color} fillOpacity={isGoal ? 0.95 : 0.4}
                stroke={color} strokeWidth={isGoal ? 0.5 : 0.3} />
              {isGoal && (
                <circle cx={s.x} cy={s.y} r={r + 1.4} fill="none" stroke={color} strokeWidth="0.4"
                  opacity="0.7" style={{ animation: "floodPulse 1.8s ease-in-out infinite" }} />
              )}
            </g>
            {s.outcome === "saved" && (
              <text x={s.team === "home" ? 99 : 1} y={s.targetY} fontSize="2.4" fill={color}
                textAnchor={s.team === "home" ? "end" : "start"} fontFamily="JetBrains Mono, monospace"
                opacity={dimmed ? 0 : 0.9}>✋</text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function PassLayer({ passes, color, teamKey, selected, onSelect, indexOffset }) {
  return (
    <g>
      {passes.map((p, i) => {
        const globalIdx = indexOffset + i;
        const isSel = selected === globalIdx;
        const dimmed = selected !== null && !isSel;
        const isKey = p.type === "key";
        const isProg = p.type === "progressive";
        const isIncomplete = p.outcome === "incomplete";
        const width = isKey ? 0.55 : isProg ? 0.4 : 0.28;
        const opacity = isIncomplete ? 0.35 : isKey ? 0.95 : isProg ? 0.65 : 0.4;
        return (
          <g key={globalIdx} opacity={dimmed ? 0.15 : 1} style={{ transition: "opacity .2s" }}
            onClick={() => onSelect(isSel ? null : globalIdx)} className="cursor-pointer">
            <line
              x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
              stroke={color} strokeWidth={width} opacity={opacity}
              strokeDasharray={isIncomplete ? "1,1" : "1"}
              strokeDashoffset={isIncomplete ? 0 : 1}
              markerEnd={isKey ? `url(#arrow-${teamKey})` : undefined}
              pathLength="1"
              style={{
                animation: isIncomplete ? "none" : "drawLine .6s ease forwards",
                animationDelay: `${globalIdx * 0.05}s`,
              }}
            />
          </g>
        );
      })}
    </g>
  );
}

function CompareBar({ label, home, away, homeColor, awayColor, suffix = "" }) {
  const total = home + away || 1;
  const homePct = (home / total) * 100;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-mono text-sm" style={{ color: homeColor }}>{home}{suffix}</span>
        <span className="text-[11px] uppercase tracking-widest text-[#B7C4BC] font-medium">{label}</span>
        <span className="font-mono text-sm" style={{ color: awayColor }}>{away}{suffix}</span>
      </div>
      <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-black/30">
        <div style={{ width: `${homePct}%`, background: homeColor, transition: "width .5s ease" }} />
        <div style={{ width: `${100 - homePct}%`, background: awayColor, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}

function useCountUp(target, duration = 500) {
  const [val, setVal] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    setVal(0);
    startRef.current = null;
    let raf;
    const step = (t) => {
      if (!startRef.current) startRef.current = t;
      const progress = Math.min((t - startRef.current) / duration, 1);
      setVal(Math.round(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function LegendDot({ color, label, ring, dashed, thick }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 14 14">
        {ring ? (
          <circle cx="7" cy="7" r="4" fill="none" stroke={color} strokeWidth="1.5" />
        ) : (
          <line x1="1" y1="7" x2="13" y2="7" stroke={color} strokeWidth={thick ? 2.5 : dashed ? 1.5 : 2}
            strokeDasharray={dashed ? "2,2" : "none"} />
        )}
      </svg>
      <span className="text-[10px] text-[#7C9083]">{label}</span>
    </div>
  );
}

export default function MatchPulse() {
  const [matchId, setMatchId] = useState(MATCHES[0].id);
  const [view, setView] = useState("shots");
  const [selectedShot, setSelectedShot] = useState(null);
  const [selectedPass, setSelectedPass] = useState(null);
  const match = useMemo(() => MATCHES.find(m => m.id === matchId), [matchId]);

  useEffect(() => { setSelectedShot(null); setSelectedPass(null); }, [matchId, view]);

  const homeScore = useCountUp(match.home.score, 600);
  const awayScore = useCountUp(match.away.score, 600);

  const selectedShotData = selectedShot !== null ? match.shots[selectedShot] : null;
  const allPasses = [...match.passes.home.map(p => ({ ...p, team: "home" })), ...match.passes.away.map(p => ({ ...p, team: "away" }))];
  const selectedPassData = selectedPass !== null ? allPasses[selectedPass] : null;

  return (
    <div
      className="w-full min-h-[780px] rounded-2xl overflow-hidden relative"
      style={{
        background: "radial-gradient(circle at 15% 0%, #123D2C55, transparent 45%), radial-gradient(circle at 85% 0%, #123D2C55, transparent 45%), #08140F",
        fontFamily: "Inter, sans-serif", color: "#F6F5F0",
      }}
    >
      <style>{FONT_IMPORT}{KEYFRAMES}</style>

      <div className="flex gap-2 px-6 pt-5 flex-wrap">
        {MATCHES.map(m => (
          <button
            key={m.id}
            onClick={() => setMatchId(m.id)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              background: m.id === matchId ? "#145C43" : "transparent",
              border: "1px solid " + (m.id === matchId ? "#1E8A63" : "#1E3A2C"),
              color: m.id === matchId ? "#F6F5F0" : "#7C9083",
            }}
          >
            {m.home.short} v {m.away.short}
          </button>
        ))}
      </div>

      <div className="px-6 pt-4 pb-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#7C9083] mb-2 font-medium">
          {match.competition}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: match.home.color }} />
            <span style={{ fontFamily: "Oswald, sans-serif" }} className="text-2xl font-semibold tracking-wide">
              {match.home.name}
            </span>
          </div>
          <div style={{ fontFamily: "Oswald, sans-serif" }} className="flex items-baseline gap-4 px-6">
            <span className="text-5xl font-bold tabular-nums" style={{ color: match.home.color }}>{homeScore}</span>
            <span className="text-xl text-[#4A5C51]">—</span>
            <span className="text-5xl font-bold tabular-nums" style={{ color: match.away.color }}>{awayScore}</span>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: "Oswald, sans-serif" }} className="text-2xl font-semibold tracking-wide">
              {match.away.name}
            </span>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: match.away.color }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 px-6 pb-6">
        <div className="rounded-xl p-4" style={{ background: "#0B3D2E1A", border: "1px solid #1E3A2C" }}>
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <div className="relative flex rounded-full p-0.5" style={{ background: "#08140F", border: "1px solid #1E3A2C" }}>
              <div
                className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-300"
                style={{ background: "#145C43", left: view === "shots" ? "2px" : "50%", width: "calc(50% - 2px)" }}
              />
              <button onClick={() => setView("shots")}
                className="relative z-10 px-4 py-1.5 text-xs font-medium rounded-full"
                style={{ color: view === "shots" ? "#F6F5F0" : "#7C9083" }}>
                Shot Map
              </button>
              <button onClick={() => setView("passes")}
                className="relative z-10 px-4 py-1.5 text-xs font-medium rounded-full"
                style={{ color: view === "passes" ? "#F6F5F0" : "#7C9083" }}>
                Pass Map
              </button>
            </div>

            {view === "shots" && selectedShotData && (
              <span className="font-mono text-xs px-2 py-1 rounded"
                style={{ background: "#08140F", color: selectedShotData.team === "home" ? match.home.color : match.away.color }}>
                {selectedShotData.minute}' · xG {selectedShotData.xg.toFixed(2)} · {OUTCOME_META[selectedShotData.outcome].label}
              </span>
            )}
            {view === "passes" && selectedPassData && (
              <span className="font-mono text-xs px-2 py-1 rounded"
                style={{ background: "#08140F", color: selectedPassData.team === "home" ? match.home.color : match.away.color }}>
                {selectedPassData.minute}' · {selectedPassData.type} · {selectedPassData.outcome}
              </span>
            )}
          </div>

          <div className="aspect-[100/64] w-full">
            <svg viewBox="0 0 100 64" className="w-full h-full">
              <defs>
                <marker id="arrow-home" markerWidth="3" markerHeight="3" refX="2.4" refY="1.5" orient="auto">
                  <path d="M0,0 L3,1.5 L0,3 Z" fill={match.home.color} />
                </marker>
                <marker id="arrow-away" markerWidth="3" markerHeight="3" refX="2.4" refY="1.5" orient="auto">
                  <path d="M0,0 L3,1.5 L0,3 Z" fill={match.away.color} />
                </marker>
              </defs>
              <PitchBase />
              {view === "shots" ? (
                <ShotLayer shots={match.shots} home={match.home} away={match.away}
                  selected={selectedShot} onSelect={setSelectedShot} />
              ) : (
                <>
                  <PassLayer passes={match.passes.home} color={match.home.color} teamKey="home"
                    selected={selectedPass} onSelect={setSelectedPass} indexOffset={0} />
                  <PassLayer passes={match.passes.away} color={match.away.color} teamKey="away"
                    selected={selectedPass} onSelect={setSelectedPass} indexOffset={match.passes.home.length} />
                </>
              )}
            </svg>
          </div>

          <div className="flex gap-4 mt-3 flex-wrap">
            {view === "shots" ? (
              <>
                <LegendDot color="#F6F5F0" label="Circle size = xG" />
                <LegendDot color={match.home.color} label="Pulsing ring = Goal" ring />
                <LegendDot color="#5C6E63" label="Dashed line = Off target" dashed />
              </>
            ) : (
              <>
                <LegendDot color="#F6F5F0" label="Thick + arrow = Key pass" thick />
                <LegendDot color="#F6F5F0" label="Medium = Progressive" />
                <LegendDot color="#5C6E63" label="Dashed = Incomplete" dashed />
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: "#0B3D2E1A", border: "1px solid #1E3A2C" }}>
          <div className="text-[11px] uppercase tracking-widest text-[#7C9083] font-medium mb-4">Match Stats</div>
          <CompareBar label="Possession" home={match.stats.possession[0]} away={match.stats.possession[1]} homeColor={match.home.color} awayColor={match.away.color} suffix="%" />
          <CompareBar label="Shots" home={match.stats.shots[0]} away={match.stats.shots[1]} homeColor={match.home.color} awayColor={match.away.color} />
          <CompareBar label="On Target" home={match.stats.onTarget[0]} away={match.stats.onTarget[1]} homeColor={match.home.color} awayColor={match.away.color} />
          <CompareBar label="Expected Goals" home={match.stats.xg[0]} away={match.stats.xg[1]} homeColor={match.home.color} awayColor={match.away.color} />
          <div className="h-px my-3" style={{ background: "#1E3A2C" }} />
          <CompareBar label="Passes Attempted" home={match.stats.passes[0]} away={match.stats.passes[1]} homeColor={match.home.color} awayColor={match.away.color} />
          <CompareBar label="Pass Accuracy" home={match.stats.passAcc[0]} away={match.stats.passAcc[1]} homeColor={match.home.color} awayColor={match.away.color} suffix="%" />
          <CompareBar label="Key Passes" home={match.stats.keyPasses[0]} away={match.stats.keyPasses[1]} homeColor={match.home.color} awayColor={match.away.color} />
          <div className="h-px my-3" style={{ background: "#1E3A2C" }} />
          <CompareBar label="Corners" home={match.stats.corners[0]} away={match.stats.corners[1]} homeColor={match.home.color} awayColor={match.away.color} />
        </div>
      </div>

      <div className="mx-6 mb-6 rounded-xl p-4" style={{ background: "#0B3D2E1A", border: "1px solid #1E3A2C" }}>
        <div className="text-[11px] uppercase tracking-widest text-[#7C9083] font-medium mb-2">Cumulative xG Race</div>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <AreaChart data={match.xgTimeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="homeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={match.home.color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={match.home.color} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="awayGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={match.away.color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={match.away.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1E3A2C" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="minute" tick={{ fill: "#7C9083", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#1E3A2C" }} />
              <YAxis tick={{ fill: "#7C9083", fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip contentStyle={{ background: "#08140F", border: "1px solid #1E3A2C", borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 12 }} labelFormatter={(m) => `Minute ${m}`} />
              <Area type="stepAfter" dataKey="home" name={match.home.short} stroke={match.home.color} fill="url(#homeGrad)" strokeWidth={2} />
              <Area type="stepAfter" dataKey="away" name={match.away.short} stroke={match.away.color} fill="url(#awayGrad)" strokeWidth={2} />
              <ReferenceLine x={45} stroke="#2A4A3B" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="px-6 pb-5 text-[11px] text-[#5C6E63] font-mono">
        Demo data — schema (shots + passes with x/y coords, xG, minute, outcome/type) mirrors typical event-data output, so this drops straight onto your Foot-Insights ETL rows.
      </div>
    </div>
  );
}
