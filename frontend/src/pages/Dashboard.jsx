import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Link } from "react-router-dom";
import { Monitor, Plus, LogOut, Terminal } from "lucide-react";

export default function Dashboard() {
  const { token, logout, currentUser } = useAuth();
  const [environments, setEnvironments] = useState([]);
  const [newEnvName, setNewEnvName] = useState("");

  useEffect(() => {
    if (token) {
      loadEnvironments();
    }
  }, [token]);

  const loadEnvironments = async () => {
    try {
      const data = await api.getEnvironments(token);
      setEnvironments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateEnv = async (e) => {
    e.preventDefault();
    if (!newEnvName) return;
    try {
      await api.createEnvironment(token, newEnvName);
      setNewEnvName("");
      loadEnvironments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          PanelSync Dashboard
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">{currentUser?.email}</span>
          <button onClick={logout} className="p-2 hover:bg-[#333] rounded-lg transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <section className="col-span-1">
          <form onSubmit={handleCreateEnv} className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#333]">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Terminal size={20} className="text-purple-400"/> New Environment
            </h2>
            <input
              type="text"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              placeholder="e.g. Lobby Screens"
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-xl flex justify-center items-center gap-2 transition-colors"
            >
              <Plus size={20} /> Create
            </button>
          </form>
        </section>

        <section className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {environments.map((env) => (
            <Link
              key={env.id}
              to={`/environments/${env.id}`}
              className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#333] hover:border-purple-500 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <Monitor size={32} className="text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-semibold">{env.name}</h3>
              <p className="text-gray-500 text-sm mt-2">Manage screens and media</p>
            </Link>
          ))}
          {environments.length === 0 && (
            <div className="col-span-2 text-center text-gray-500 py-12 bg-[#1a1a1a] border border-[#333] border-dashed rounded-2xl">
              No environments yet. Create one to get started!
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
