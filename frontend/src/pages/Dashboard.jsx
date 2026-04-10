import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Link } from "react-router-dom";
import { Monitor, Plus, Terminal, Pencil, Trash2, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import SkeletonCard from "../components/SkeletonCard";
import ConfirmModal from "../components/ConfirmModal";
import Spinner from "../components/Spinner";
import InfoTooltip from "../components/InfoTooltip";
import { TOOLTIP_MESSAGES } from "../utils/tooltipMessages";

export default function Dashboard() {
  const { token } = useAuth();
  const [environments, setEnvironments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");

  // Rename modal state
  const [renameModal, setRenameModal] = useState(null); // { id, name }
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState(null); // { id, name }
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (token) loadEnvironments();
  }, [token]);

  const loadEnvironments = async () => {
    setIsLoading(true);
    try {
      const data = await api.getEnvironments(token);
      setEnvironments(data);
    } catch (err) {
      toast.error("Failed to load environments.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Create ──────────────────────────────────────────────────────────────
  const handleCreateEnv = async (e) => {
    e.preventDefault();
    const trimmed = newEnvName.trim();
    if (!trimmed || isCreating) return;

    setIsCreating(true);
    const toastId = toast.loading("Creating environment...");
    try {
      await api.createEnvironment(token, trimmed);
      setNewEnvName("");
      toast.success("Environment created!", { id: toastId });
      await loadEnvironments();
    } catch (err) {
      toast.error(err.message || "Failed to create environment.", { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  // ── Rename ──────────────────────────────────────────────────────────────
  const openRename = (env, e) => {
    e.preventDefault();
    e.stopPropagation();
    setRenameModal(env);
    setRenameValue(env.name);
  };

  const handleRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || isRenaming) return;

    setIsRenaming(true);
    try {
      await api.renameEnvironment(token, renameModal.id, trimmed);
      toast.success("Environment renamed.");
      setRenameModal(null);
      await loadEnvironments();
    } catch (err) {
      toast.error(err.message || "Failed to rename.");
    } finally {
      setIsRenaming(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const openDelete = (env, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteModal(env);
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await api.deleteEnvironment(token, deleteModal.id);
      toast.success("Environment deleted.");
      setDeleteModal(null);
      await loadEnvironments();
    } catch (err) {
      toast.error(err.message || "Failed to delete.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <Navbar />

      {/* Main content — offset for fixed navbar */}
      <main className="pt-16 px-4 md:px-8 pb-12">
        <div className="max-w-6xl mx-auto">
          {/* Page header */}
          <div className="py-8 mb-6">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1 text-sm">Manage your environments and connected screens.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Create environment panel */}
            <section className="col-span-1">
              <form
                onSubmit={handleCreateEnv}
                className="bg-[#111114] p-6 rounded-2xl border border-[#222] sticky top-24"
              >
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-gray-200">
                  <Terminal size={18} className="text-purple-400" />
                  New Environment
                  <InfoTooltip message={TOOLTIP_MESSAGES.createEnv} />
                </h2>
                <input
                  type="text"
                  id="new-env-name"
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value)}
                  placeholder="e.g. Lobby Screens"
                  maxLength={60}
                  disabled={environments.length >= 4}
                  className="w-full bg-[#0a0a0d] border border-[#2a2a2a] rounded-xl px-4 py-3 mb-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  id="create-env-btn"
                  disabled={isCreating || !newEnvName.trim() || environments.length >= 4}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-xl flex justify-center items-center gap-2 transition-colors"
                >
                  {isCreating ? <Spinner size={16} /> : <Plus size={16} />}
                  {isCreating ? "Creating..." : "Create"}
                </button>

                {/* Environment usage counter */}
                {!isLoading && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-gray-600">
                      {environments.length} / 4 environments used
                    </p>
                    {environments.length >= 4 && (
                      <p className="text-xs text-yellow-500/80 mt-1">
                        Limit reached. Delete one to create a new environment.
                      </p>
                    )}
                  </div>
                )}
              </form>
            </section>

            {/* Environments grid */}
            <section className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {isLoading ? (
                // Skeleton placeholders
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : environments.length === 0 ? (
                <div className="col-span-2 text-center text-gray-500 py-16 bg-[#111114] border border-[#222] border-dashed rounded-2xl">
                  <Monitor size={40} className="mx-auto mb-3 text-gray-700" />
                  <p className="text-sm">No environments yet.</p>
                  <p className="text-xs text-gray-600 mt-1">Create one to get started.</p>
                </div>
              ) : (
                environments.map((env) => (
                  <Link
                    key={env.id}
                    to={`/environments/${env.id}`}
                    className="group bg-[#111114] p-6 rounded-2xl border border-[#222] hover:border-purple-500/50 hover:bg-[#16161c] transition-all cursor-pointer relative"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-purple-500/15 transition-colors">
                        <Monitor size={20} className="text-blue-400 group-hover:text-purple-400 transition-colors" />
                      </div>
                      {/* Actions — visible on hover */}
                      <div
                        className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => openRename(env, e)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Rename"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => openDelete(env, e)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-base font-semibold text-white truncate">{env.name}</h3>
                    <p className="text-gray-500 text-xs mt-1">Manage screens &amp; media</p>
                    <div className="flex items-center gap-1 text-xs text-purple-400 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open <ChevronRight size={12} />
                    </div>
                  </Link>
                ))
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Rename Modal */}
      {renameModal && (
        <ConfirmModal
          title="Rename Environment"
          confirmLabel="Save"
          isLoading={isRenaming}
          onConfirm={handleRename}
          onCancel={() => setRenameModal(null)}
        >
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            placeholder="New name"
            maxLength={60}
            className="w-full bg-[#0a0a0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </ConfirmModal>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <ConfirmModal
          title="Delete Environment"
          message={`Are you sure you want to delete "${deleteModal.name}"? This will also remove all linked screens.`}
          confirmLabel="Delete"
          isDestructive
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
}
