// client/src/pages/ResetPasswordPage.tsx
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  Mail,
  ArrowLeft,
  KeyRound,
} from "lucide-react";

export function ResetPasswordPage() {
  const [, setLocation] = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const [form, setForm] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    const password = form.newPassword;
    setPasswordStrength({
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [form.newPassword]);

  // Send verification code
  const sendVerificationCode = async () => {
    setError("");
    setLoading(true);
    setEmailSent(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email || !emailRegex.test(form.email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      const data = await response.json();

      // Handle 404 - user not found
      if (response.status === 404) {
        throw new Error(
          data.message || "No account found with this email address"
        );
      }

      // Handle other errors
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to send verification code");
      }

      // Success
      if (data.success) {
        setEmailSent(true);
        setResendTimer(60);
        setError("");

        // In development, log the verification code to console
        if (data.verificationCode) {
          console.log(
            "📧 Dev Mode - Verification Code:",
            data.verificationCode
          );
        }
      }
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      setError(error.message || "Failed to send verification code.");
      setEmailSent(false);
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const resendCode = async () => {
    if (resendTimer > 0) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      const data = await response.json();

      // Handle 404 - user not found
      if (response.status === 404) {
        setEmailSent(false);
        throw new Error(
          data.message || "No account found with this email address"
        );
      }

      // Handle rate limiting
      if (response.status === 429) {
        throw new Error("Too many requests. Please try again later.");
      }

      // Handle other errors
      if (!response.ok || data.success === false) {
        setEmailSent(false);
        throw new Error(data.message || "Failed to resend code");
      }

      // Success
      if (data.success) {
        setResendTimer(60);
        setError("");

        // In development, log the verification code to console
        if (data.verificationCode) {
          console.log(
            "📧 Dev Mode - Verification Code:",
            data.verificationCode
          );
        }
      }
    } catch (error: any) {
      console.error("Error resending code:", error);
      setError(error.message || "Failed to resend code.");
      if (error.message.includes("No account found")) {
        setEmailSent(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!form.email) {
      setError("Please enter your email address");
      return;
    }

    if (!form.code || form.code.length !== 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    if (form.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // First verify the code
      const verifyResponse = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          code: form.code,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyData.valid) {
        throw new Error(verifyData.message || "Invalid verification code");
      }

      // Then reset the password
      const resetResponse = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          code: form.code,
          newPassword: form.newPassword,
        }),
      });

      const resetData = await resetResponse.json();

      if (!resetResponse.ok) {
        throw new Error(resetData.message || "Failed to reset password");
      }

      setSuccess(true);
      setTimeout(() => setLocation("/login"), 3000);
    } catch (error: any) {
      setError(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-center mt-4">
              Password Reset Successfully!
            </CardTitle>
            <CardDescription className="text-center">
              Your password has been reset. Redirecting to login...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Lock className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email to receive a verification code
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Password Reset</CardTitle>
            <CardDescription>
              Fill in all fields below to reset your password
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field with Send Code Button */}
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => {
                        setForm({ ...form, email: e.target.value });
                        // Clear error when user starts typing a new email
                        if (error) setError("");
                      }}
                      className="pl-10"
                      placeholder="your@email.com"
                      disabled={emailSent && !error}
                    />
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  </div>
                  <Button
                    type="button"
                    onClick={emailSent ? resendCode : sendVerificationCode}
                    disabled={loading || !form.email || resendTimer > 0}
                    variant={emailSent ? "outline" : "default"}
                  >
                    {loading
                      ? "Sending..."
                      : resendTimer > 0
                      ? `Resend (${resendTimer}s)`
                      : emailSent
                      ? "Resend"
                      : "Send Code"}
                  </Button>
                </div>
                {emailSent && !error && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Verification code sent to your email
                  </p>
                )}
                {emailSent && !error && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmailSent(false);
                      setForm({ ...form, code: "" });
                      setResendTimer(0);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                  >
                    Change email address
                  </button>
                )}
              </div>

              {/* Verification Code Field */}
              <div>
                <Label htmlFor="code">Verification Code</Label>
                <div className="relative">
                  <Input
                    id="code"
                    type="text"
                    value={form.code}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        code: e.target.value.replace(/\D/g, "").slice(0, 6),
                      })
                    }
                    className="pl-10 text-center text-lg font-mono tracking-wider"
                    placeholder="000000"
                    maxLength={6}
                    disabled={!emailSent || !!error}
                  />
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {emailSent && !error
                    ? "Enter the 6-digit code from your email"
                    : "Send a verification code first"}
                </p>
              </div>

              {/* New Password Field */}
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={form.newPassword}
                    onChange={(e) =>
                      setForm({ ...form, newPassword: e.target.value })
                    }
                    className="pl-10 pr-10"
                    placeholder="Enter new password"
                    disabled={!emailSent || !!error}
                  />
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={!emailSent || !!error}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm({ ...form, confirmPassword: e.target.value })
                  }
                  placeholder="Confirm new password"
                  disabled={!emailSent || !!error}
                />
              </div>

              {/* Password Requirements */}
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  Password Requirements:
                </p>
                <div className="space-y-1">
                  <PasswordRequirement
                    met={passwordStrength.length}
                    text="At least 6 characters"
                  />
                  <PasswordRequirement
                    met={passwordStrength.uppercase}
                    text="One uppercase letter"
                    optional
                  />
                  <PasswordRequirement
                    met={passwordStrength.lowercase}
                    text="One lowercase letter"
                    optional
                  />
                  <PasswordRequirement
                    met={passwordStrength.number}
                    text="One number"
                    optional
                  />
                  <PasswordRequirement
                    met={passwordStrength.special}
                    text="One special character"
                    optional
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading ||
                  !form.email ||
                  !form.code ||
                  !form.newPassword ||
                  !passwordStrength.length
                }
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </Button>

              {/* Back to Login */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLocation("/login")}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PasswordRequirement({
  met,
  text,
  optional = false,
}: {
  met: boolean;
  text: string;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center space-x-2">
      {met ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <div
          className={`h-4 w-4 rounded-full border-2 ${
            optional ? "border-gray-300" : "border-gray-400"
          }`}
        />
      )}
      <span
        className={`text-xs ${
          met ? "text-green-700" : optional ? "text-gray-500" : "text-gray-700"
        }`}
      >
        {text} {optional && "(recommended)"}
      </span>
    </div>
  );
}

export default ResetPasswordPage;
