"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/index";
import { updateUser } from "../../../store/slices/authSlice";
import {
  useUpdateUserMutation,
  useChangePasswordMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferenceMutation,
  type EmailNotificationType,
} from "../../../services/allApis";
import { Button, Avatar } from "../../../components/ui/index";
import { setTheme } from "../../../store/slices/uiSlice";
import toast from "react-hot-toast";
import { User, Lock, Bell, Palette } from "lucide-react";

type ProfileForm = {
  name: string;
  avatar: string;
  onlineStatus: "online" | "away" | "dnd";
  theme: "light" | "dark";
};

const EMAIL_NOTIFICATION_OPTIONS: Array<{ type: EmailNotificationType; label: string }> = [
  { type: "task_assigned", label: "Email me when task assigned" },
  { type: "mentioned_in_comment", label: "Email me when mentioned" },
  { type: "task_status_changed", label: "Email me when task status changes" },
  { type: "task_approved", label: "Email me when task approved" },
  { type: "sprint_deadline", label: "Email me for sprint deadlines" },
  { type: "task_due_tomorrow", label: "Email me when task due tomorrow" },
  { type: "high_priority_assigned", label: "Email me for high priority tasks" },
];

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [updateUserMutation, { isLoading: saving }] = useUpdateUserMutation();
  const [changePwd, { isLoading: changingPwd }] = useChangePasswordMutation();
  const { data: emailPreferences = [], isLoading: loadingEmailPreferences } =
    useGetNotificationPreferencesQuery(undefined, { skip: !user });
  const [updateEmailPreference, { isLoading: savingEmailPreference }] =
    useUpdateNotificationPreferenceMutation();

  const [profile, setProfile] = useState<ProfileForm>({
    name: user?.name || "",
    avatar: user?.avatar || "",
    onlineStatus: user?.onlineStatus || "online",
    theme: user?.theme || "light",
  });
  const [emailPrefs, setEmailPrefs] = useState<Record<EmailNotificationType, boolean>>(
    () =>
      Object.fromEntries(
        EMAIL_NOTIFICATION_OPTIONS.map(({ type }) => [type, true]),
      ) as Record<EmailNotificationType, boolean>,
  );

  const [pwdForm, setPwdForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const updated = await updateUserMutation({
        id: user._id,
        data: {
          name: profile.name,
          avatar: profile.avatar,
          onlineStatus: profile.onlineStatus,
          theme: profile.theme,
        } as Parameters<typeof updateUserMutation>[0]["data"],
      }).unwrap();
      dispatch(
        updateUser({
          name: updated.name,
          avatar: updated.avatar,
          onlineStatus: updated.onlineStatus as "online" | "away" | "dnd",
          theme: updated.theme as "light" | "dark",
        }),
      );
      dispatch(setTheme(profile.theme as "light" | "dark"));
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  useEffect(() => {
    if (emailPreferences.length === 0) return;

    setEmailPrefs(
      Object.fromEntries(
        EMAIL_NOTIFICATION_OPTIONS.map(({ type }) => [
          type,
          emailPreferences.find((item) => item.notificationType === type)?.emailEnabled ?? true,
        ]),
      ) as Record<EmailNotificationType, boolean>,
    );
  }, [emailPreferences]);

  const handleSaveEmailPreferences = async () => {
    if (!user) return;
    try {
      await Promise.all(
        EMAIL_NOTIFICATION_OPTIONS.map(({ type }) =>
          updateEmailPreference({
            id: user._id,
            notificationType: type,
            emailEnabled: emailPrefs[type],
          }).unwrap(),
        ),
      );
      toast.success("Preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!pwdForm.oldPassword) errs.oldPassword = "Required";
    if (!pwdForm.newPassword || pwdForm.newPassword.length < 8)
      errs.newPassword = "Min 8 characters";
    if (pwdForm.newPassword !== pwdForm.confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    setPwdErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (!user) return;
    try {
      await changePwd({
        id: user._id,
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword,
      }).unwrap();
      toast.success("Password changed!");
      setPwdForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      toast.error(e?.data?.message || "Failed to change password");
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
          Profile
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Personal Information
          </h2>
        </div>

        <div className="flex flex-col items-start gap-4 mb-6 sm:flex-row sm:items-center">
          <Avatar
            name={profile.name || user.name}
            avatar={profile.avatar || user.avatar}
            size="lg"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Avatar URL
            </p>
            <input
              type="url"
              placeholder="https://example.com/avatar.jpg"
              value={profile.avatar}
              onChange={(e) =>
                setProfile({ ...profile, avatar: e.target.value })
              }
              className="mt-1 w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500 cursor-not-allowed"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Online Status
              </label>
              <select
                value={profile.onlineStatus}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    onlineStatus: e.target.value as ProfileForm["onlineStatus"],
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="online">🟢 Online</option>
                <option value="away">🟡 Away</option>
                <option value="dnd">🔴 Do Not Disturb</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <Palette className="w-3.5 h-3.5" /> Theme
              </label>
              <select
                value={profile.theme}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    theme: e.target.value as ProfileForm["theme"],
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">☀️ Light</option>
                <option value="dark">🌙 Dark</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-stretch mt-5 sm:justify-end">
          <Button onClick={handleSaveProfile} loading={saving}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Notification prefs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Email Notification Preferences
          </h2>
        </div>

        <div className="space-y-3">
          {EMAIL_NOTIFICATION_OPTIONS.map(({ type, label }) => (
            <label key={type} className="flex items-center justify-between gap-4 py-2">
              <span className="min-w-0 text-sm text-slate-700 dark:text-slate-300">
                {label}
              </span>
              <input
                type="checkbox"
                checked={emailPrefs[type]}
                disabled={loadingEmailPreferences || savingEmailPreference}
                onChange={() =>
                  setEmailPrefs((prev) => ({ ...prev, [type]: !prev[type] }))
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                aria-label={label}
              />
            </label>
          ))}
        </div>

        <div className="flex justify-stretch mt-4 sm:justify-end">
          <Button
            onClick={handleSaveEmailPreferences}
            loading={savingEmailPreference}
            variant="secondary"
            disabled={loadingEmailPreferences}
          >
            Save Preferences
          </Button>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Change Password
          </h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            {
              key: "oldPassword",
              label: "Current Password",
              placeholder: "••••••••",
            },
            {
              key: "newPassword",
              label: "New Password",
              placeholder: "Minimum 8 characters",
            },
            {
              key: "confirmPassword",
              label: "Confirm New Password",
              placeholder: "Repeat new password",
            },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {label}
              </label>
              <input
                type="password"
                placeholder={placeholder}
                value={pwdForm[key as keyof typeof pwdForm]}
                onChange={(e) =>
                  setPwdForm({ ...pwdForm, [key]: e.target.value })
                }
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${pwdErrors[key] ? "border-red-500" : "border-slate-200 dark:border-slate-700"}`}
              />
              {pwdErrors[key] && (
                <p className="text-red-400 text-xs mt-1">{pwdErrors[key]}</p>
              )}
            </div>
          ))}

          <div className="flex justify-stretch pt-1 sm:justify-end">
            <Button type="submit" loading={changingPwd} variant="secondary">
              Change Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
