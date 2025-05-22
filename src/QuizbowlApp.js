import React from "react";
import TTSReader from "./components/TTSReader";
import { BookOpen, UserCircle2 } from "lucide-react";

export default function QuizbowlApp({ userId, appId }) {
  return (
    <main className="flex flex-col items-center min-h-screen bg-gray-950 text-gray-100 pt-8">
      <header className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold tracking-tight">NAQT Quizbowl Practice</h1>
        </div>
        <div className="flex gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><UserCircle2 className="w-4 h-4" /> User ID: <span className="font-mono">{userId}</span></span>
          <span>|</span>
          <span>App ID: <span className="font-mono">{appId}</span></span>
        </div>
      </header>
      <section className="w-full max-w-2xl bg-gray-900 rounded-xl shadow-lg p-6 mb-8">
        <div className="text-center text-gray-400 py-12 text-lg">
          Quiz Content Area — Tossups, Bonuses, Scoreboard will appear here
        </div>
      </section>
      <TTSReader />
    </main>
  );
}
