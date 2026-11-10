import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Asset, OwnerType } from '../../types';
import { formatINR, getOwnerLabel, formatDateKolkata } from '../../utils/finance';
import { AssetModal } from '../modals/AssetModal';
import { WorkspaceMembersView } from './WorkspaceMembersView';

interface SettingsViewProps {
  onConfirmClearWorkspace: () => void;
  initialSubTab?: 'general' | 'members';
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onConfirmClearWorkspace,
  initialSubTab = 'general',
}) => {
  const {
    person1Name,
    person2Name,
    updatePartnerNames,
    assets,
    deleteAsset,
    categories,
    addCategory,
    deleteCategory,
    seedDemoWorkspace,
    workspaceMembers,
  } = useFinance();

  const [activeSubTab, setActiveSubTab] = useState<'general' | 'members'>(initialSubTab);

  // Partner names editing
  const [p1, setP1] = useState(person1Name);
  const [p2, setP2] = useState(person2Name);
  const [isSavingNames, setIsSavingNames] = useState(false);
  const [nameSaveSuccess, setNameSaveSuccess] = useState(false);

  useEffect(() => {
    setP1(person1Name);
    setP2(person2Name);
  }, [person1Name, person2Name]);

  const handleSavePartnerNames = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!p1.trim() || !p2.trim()) return;
    try {
      setIsSavingNames(true);
      await updatePartnerNames(p1.trim(), p2.trim());
      setNameSaveSuccess(true);
      setTimeout(() => setNameSaveSuccess(false), 2500);
    } finally {
      setIsSavingNames(false);
    }
  };

  // Asset Modal state
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);

  // Category state
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'inflow' | 'outflow'>('outflow');
  const [isAddingCat, setIsAddingCat] = useState(false);

  const [isSeeding, setIsSeeding] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      setIsAddingCat(true);
      await addCategory({
        name: catName.trim(),
        type: catType,
      });
      setCatName('');
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      await seedDemoWorkspace();
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Settings & Workspace</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {activeSubTab === 'members'
              ? 'Shared workspace access, member management, and invite links'
              : 'Customize partner names, manual assets, and categories'}
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-stone-200/80 shadow-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('general')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'general'
                ? 'bg-violet-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Preferences & Assets
          </button>
          <button
            onClick={() => setActiveSubTab('members')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'members'
                ? 'bg-violet-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Members
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeSubTab === 'members' ? 'bg-violet-700 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {workspaceMembers.length}
            </span>
          </button>
        </div>
      </div>

      {activeSubTab === 'members' ? (
        <WorkspaceMembersView />
      ) : (
        <>
          {/* 1. Partner Names Configuration */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Partner Names</h2>
            <p className="text-xs text-stone-500">Personalize dropdown labels across income, expenses, and accounts</p>
          </div>
        </div>

        <form onSubmit={handleSavePartnerNames} className="space-y-3 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Person 1 Label (Default: "Me") *
              </label>
              <input
                type="text"
                required
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                placeholder="e.g. Alex, Me"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Person 2 Label (Default: "My girlfriend") *
              </label>
              <input
                type="text"
                required
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                placeholder="e.g. Sam, My girlfriend, Partner"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {nameSaveSuccess ? (
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Names updated across all dropdowns
              </span>
            ) : (
              <span className="text-[11px] text-stone-400">Persisted permanently to your account</span>
            )}
            <button
              type="submit"
              disabled={isSavingNames}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {isSavingNames ? 'Saving...' : 'Save Partner Names'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Manual Assets Management (Investments, Gold, SGBs, Real Estate) */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Manual Assets ({assets.length})</h2>
              <p className="text-xs text-stone-500">Mutual funds, stocks, gold, PPF, and real estate for net worth</p>
            </div>
          </div>
          <button
            onClick={() => {
              setAssetToEdit(null);
              setIsAssetModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors flex items-center gap-1 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Asset
          </button>
        </div>

        {assets.length === 0 ? (
          <div className="text-center py-6 text-stone-400 text-xs">
            No manual assets added yet. Add mutual funds, gold bonds, or property to complete net worth tracking.
          </div>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-stone-500 font-semibold">
                  <th className="py-2.5 px-3">Asset Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Owner</th>
                  <th className="py-2.5 px-3 text-right">Value (₹)</th>
                  <th className="py-2.5 px-3">Valuation Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {assets.map((ass) => (
                  <tr key={ass.id} className="hover:bg-stone-50/50">
                    <td className="py-3 px-3 font-medium text-stone-900">{ass.name}</td>
                    <td className="py-3 px-3 text-stone-500">{ass.category}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                        {getOwnerLabel(ass.owner, person1Name, person2Name)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900 tabular-nums">
                      {formatINR(ass.valuePaise)}
                    </td>
                    <td className="py-3 px-3 text-stone-500">{ass.asOfDate}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setAssetToEdit(ass);
                            setIsAssetModalOpen(true);
                          }}
                          className="p-1 text-stone-400 hover:text-stone-700 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete asset "${ass.name}"?`)) {
                              await deleteAsset(ass.id);
                            }
                          }}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Categories Management */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <h2 className="text-sm font-semibold text-stone-900 mb-1">
          Custom Categories ({categories.length})
        </h2>
        <p className="text-xs text-stone-500 mb-4">
          Organize spending and income sources
        </p>

        <form
          onSubmit={handleAddCategory}
          className="p-3.5 bg-stone-50/70 rounded-xl border border-stone-200/70 flex flex-wrap gap-2.5 items-end mb-4"
        >
          <div className="flex-1 min-w-[180px]">
            <input
              type="text"
              required
              placeholder="e.g. Subscriptions, Groceries, Gym"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs"
            />
          </div>

          <div>
            <select
              value={catType}
              onChange={(e) => setCatType(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs"
            >
              <option value="outflow">Expense</option>
              <option value="inflow">Income</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isAddingCat}
            className="py-1.5 px-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <div
              key={c.id}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border ${
                c.type === 'inflow'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-stone-50 text-stone-700 border-stone-200'
              }`}
            >
              <span>{c.name}</span>
              <button
                onClick={() => deleteCategory(c.id)}
                className="text-stone-400 hover:text-rose-600 ml-1 text-sm font-bold"
                title="Delete category"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Workspace Management (Seed demo / Reset) */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
        <h2 className="text-sm font-semibold text-stone-900">Workspace Data</h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-violet-50/60 border border-violet-100">
          <div>
            <h3 className="text-xs font-bold text-violet-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              Load Sample Partner Finances
            </h3>
            <p className="text-[11px] text-violet-700 mt-0.5">
              Load realistic separate accounts for {person1Name} & {person2Name}, cards, loans, mutual funds, and transfers.
            </p>
          </div>
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0 disabled:opacity-50"
          >
            {isSeeding ? 'Loading...' : 'Load Sample Data'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-50/60 border border-rose-100">
          <div>
            <h3 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Clear All Data
            </h3>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Permanently delete all accounts, transactions, and debt records.
            </p>
          </div>
          <button
            onClick={onConfirmClearWorkspace}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0"
          >
            Clear Workspace
          </button>
        </div>
      </div>
        </>
      )}

      {/* Modal */}
      <AssetModal
        isOpen={isAssetModalOpen}
        onClose={() => {
          setIsAssetModalOpen(false);
          setAssetToEdit(null);
        }}
        assetToEdit={assetToEdit}
      />
    </div>
  );
};
