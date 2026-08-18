import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import apiClient from "../api/axiosClient";
import { BUSINESS_CATEGORIES } from "../utils/categories";

export default function OwnerSettings() {
  const { activeShop, loadShops } = useOutletContext();
  
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [categoryForm, setCategoryForm] = useState({
    business_category: "",
    business_sub_category: "",
  });
  const [savingCategory, setSavingCategory] = useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    default_open_time: "09:00",
    default_close_time: "20:00",
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [resubmitFile, setResubmitFile] = useState(null);
  const [resubmitting, setResubmitting] = useState(false);

  const { user, updateProfile } = require("../context/AuthContext").useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileMessage("");
    setSavingProfile(true);
    try {
      await updateProfile({ name: profileForm.name.trim(), phone: profileForm.phone.trim() });
      setProfileMessage("Personal profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update your profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  useEffect(() => {
    if (!activeShop) return;
    setCategoryForm({
      business_category: activeShop.business_category || "",
      business_sub_category: activeShop.business_sub_category || "",
    });
    setScheduleForm({
      default_open_time: String(activeShop.default_open_time || "09:00").slice(0, 5),
      default_close_time: String(activeShop.default_close_time || "20:00").slice(0, 5),
    });
  }, [activeShop]);

  async function saveCategorySettings() {
    if (!activeShop) return;
    if (!categoryForm.business_category || !categoryForm.business_sub_category) {
      setError("Please select both a main category and a sub-category.");
      return;
    }
    
    if (
      categoryForm.business_category === activeShop.business_category &&
      categoryForm.business_sub_category === activeShop.business_sub_category
    ) {
      setMessage("Category is already up to date.");
      return;
    }

    if (!window.confirm("Changing your shop's category will require admin verification again. Your shop's status will change to 'Pending Verification'. Do you want to continue?")) {
      return;
    }

    setError("");
    setMessage("");
    setSavingCategory(true);

    try {
      await apiClient.patch(`/shops/${activeShop.shop_id}`, {
        business_category: categoryForm.business_category,
        business_sub_category: categoryForm.business_sub_category,
      });
      setMessage("Shop category updated successfully. Your shop is now pending verification.");
      await loadShops();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update shop category.");
    } finally {
      setSavingCategory(false);
    }
  }

  async function saveSchedule() {
    if (!activeShop) return;

    setError("");
    setMessage("");
    setSavingSchedule(true);

    try {
      await apiClient.patch(`/shops/${activeShop.shop_id}`, {
        default_open_time: scheduleForm.default_open_time,
        default_close_time: scheduleForm.default_close_time,
      });

      setMessage("Shop schedule updated successfully.");
      await loadShops();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update shop schedule.");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleResubmitDocument() {
    if (!resubmitFile) {
      setError("Please select a new verification document.");
      return;
    }
    setResubmitting(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("document", resubmitFile);
      const { data } = await apiClient.post(`/shops/${activeShop.shop_id}/resubmit-verification`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(data.message);
      setResubmitFile(null);
      await loadShops();
    } catch (err) {
      setError(err.response?.data?.message || "Could not resubmit document.");
    } finally {
      setResubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {message && <div className="bg-pulse-soft text-pulse rounded-md px-3.5 py-2.5 text-[13.5px]">{message}</div>}
      {error && <div className="bg-coral-soft text-coral rounded-md px-3.5 py-2.5 text-[13.5px]">{error}</div>}

      {profileMessage && <div className="bg-pulse-soft text-pulse rounded-md px-3.5 py-2.5 text-[13.5px]">{profileMessage}</div>}

      <div className="card">
        <h2 className="font-display font-semibold text-ink text-[15px] mb-3">Personal Profile</h2>
        <form onSubmit={handleProfileSave} className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Your Name</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
              required
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
              required
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile || (profileForm.name === user?.name && profileForm.phone === user?.phone)}
            className="btn-primary"
          >
            {savingProfile ? "Saving..." : "Update Profile"}
          </button>
        </form>
      </div>

      {activeShop.verification_status === "rejected" && (
        <div className="card border-red-200">
          <h2 className="font-display font-semibold text-ink text-[15px] mb-3 text-red-700">Resubmit Verification Document</h2>
          <p className="text-red-600 dark:text-red-300 text-[13.5px] mb-4">
            Your previous document was rejected. Please upload a new, clear copy of your business license or registration.
          </p>
          <div className="flex gap-2.5 flex-wrap items-end">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setResubmitFile(e.target.files[0])}
              className="text-sm text-ink"
            />
            <button
              onClick={handleResubmitDocument}
              disabled={resubmitting}
              className="btn-primary"
            >
              {resubmitting ? "Resubmitting..." : "Resubmit & Reapply"}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="font-display font-semibold text-ink text-[15px] mb-3">Shop Category</h2>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Business Category</label>
            <select
              value={categoryForm.business_category}
              onChange={(e) => setCategoryForm({ ...categoryForm, business_category: e.target.value, business_sub_category: "" })}
              className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20 cursor-pointer"
            >
              <option value="">Select a category</option>
              {Object.keys(BUSINESS_CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Sub-category</label>
            <select
              value={categoryForm.business_sub_category}
              onChange={(e) => setCategoryForm({ ...categoryForm, business_sub_category: e.target.value })}
              disabled={!categoryForm.business_category}
              className="w-full px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20 cursor-pointer disabled:opacity-50"
            >
              <option value="">Select a sub-category</option>
              {categoryForm.business_category && BUSINESS_CATEGORIES[categoryForm.business_category].map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={saveCategorySettings}
            disabled={savingCategory || (categoryForm.business_category === activeShop.business_category && categoryForm.business_sub_category === activeShop.business_sub_category)}
            className="btn-primary"
          >
            {savingCategory ? "Saving..." : "Save category"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display font-semibold text-ink text-[15px] mb-3">Shop Schedule</h2>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Opening time</label>
            <input
              type="time"
              value={scheduleForm.default_open_time}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, default_open_time: e.target.value }))}
              className="px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink-soft mb-1.5">Closing time</label>
            <input
              type="time"
              value={scheduleForm.default_close_time}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, default_close_time: e.target.value }))}
              className="px-3 py-2 border border-border rounded-md bg-bg text-ink focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
            />
          </div>
          <button
            type="button"
            onClick={saveSchedule}
            disabled={savingSchedule}
            className="btn-primary"
          >
            {savingSchedule ? "Saving..." : "Save schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
