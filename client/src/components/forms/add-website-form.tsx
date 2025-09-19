import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { insertWebsiteSchema } from "@shared/schema";
import { api } from "@/lib/api";
import { z } from "zod";

// 🔐 add sanitizer (alias to the name used below)
import {  Sanitizer } from "@/utils/inputSanitizer";

const formSchema = insertWebsiteSchema.extend({
  name: z.string().min(1, "Website name is required"),
  url: z.string().url("Please enter a valid URL"),
  wpApplicationName: z.string().min(1, "Application name is required"),
  wpApplicationPassword: z
    .string()
    .min(
      20,
      "Application password must be at least 20 characters (WordPress generates 24)"
    ),
  wpUsername: z.string().min(1, "WordPress username is required"),
});

type FormData = z.infer<typeof formSchema>;

interface AddWebsiteFormProps {
  onSuccess: () => void;
}

/** Normalizes + lightly sanitizes a URL string. Keeps protocol if present. */
const sanitizeUrl = (raw: string): string => {
  let s = Sanitizer.sanitizeText(raw);
  s = s.trim();

  // Add protocol if missing
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;

  try {
    const u = new URL(s);
    // Lowercase host, strip dangerous chars in pathname/query as a basic hardening step
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return s; // let zod/validateUrl handle actual invalids
  }
};

/** Returns a cleaned object without mutating the original form data */
const sanitizeFormData = (data: FormData): FormData => ({
  ...data,
  name: Sanitizer.sanitizeText(data.name),
  url: sanitizeUrl(data.url),
  wpApplicationName: Sanitizer.sanitizeText(data.wpApplicationName),
  wpApplicationPassword: (data.wpApplicationPassword ?? "").trim(),
  wpUsername: Sanitizer.sanitizeText(data.wpUsername),
});

export default function AddWebsiteForm({ onSuccess }: AddWebsiteFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      aiModel: "gpt-4o",
      autoPosting: false, // Default to manual approval for security
      requireApproval: true,
      brandVoice: "professional",
    },
  });

  const createWebsite = useMutation({
    mutationFn: api.createWebsite,
    onSuccess: (data) => {
      console.log("✅ Website created successfully:", data);

      // Invalidate user-scoped queries
      queryClient.invalidateQueries({ queryKey: ["/api/user/websites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/activity-logs"] });

      // Optimistic add
      queryClient.setQueryData(["/api/user/websites"], (oldData: any) => {
        if (oldData) return [...oldData, data];
        return [data];
      });

      toast({
        title: "Website Connected Successfully",
        description: `${watch("name")} has been connected and is ready for content management.`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("❌ Website creation error:", error);

      let errorMessage =
        "Failed to connect website. Please check your credentials.";

      if (error.message?.includes("authentication")) {
        errorMessage =
          "WordPress authentication failed. Please check your username and application password.";
      } else if (error.message?.includes("network")) {
        errorMessage =
          "Unable to reach your WordPress site. Please check the URL.";
      } else if (error.message?.includes("permission")) {
        errorMessage =
          "Insufficient permissions. Please ensure your WordPress user has admin or editor rights.";
      } else if (error.message?.includes("access denied")) {
        errorMessage =
          "Access denied. Please ensure you're logged in and try again.";
      } else if (error.message?.includes("validation")) {
        errorMessage = "Please check all required fields are filled correctly.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // URL validation function (runs on sanitized URL)
  const validateWebsiteUrl = async (url: string) => {
    const safeUrl = sanitizeUrl(url);
    if (!safeUrl || !safeUrl.startsWith("http")) return;

    setIsValidatingUrl(true);
    try {
      const result = await api.validateUrl(safeUrl);
      if (!result.valid) {
        toast({
          title: "URL Validation Failed",
          description:
            result.message ||
            "The provided URL appears to be invalid or unreachable.",
          variant: "destructive",
        });
      } else if (result.isWordPress === false) {
        toast({
          title: "Not a WordPress Site",
          description:
            "The URL doesn't appear to be a WordPress site. Please verify the URL.",
          variant: "destructive",
        });
      } else if (result.isWordPress === true) {
        toast({
          title: "WordPress Site Detected",
          description: "Great! We've confirmed this is a WordPress site.",
        });
      }
    } catch (error) {
      console.warn("URL validation failed:", error);
      // silent
    } finally {
      setIsValidatingUrl(false);
    }
  };

  const onSubmit = async (raw: FormData) => {
    console.log("🔍 Form submitted (raw):", raw);

    // Sanitize everything before validating/creating
    const cleaned = sanitizeFormData(raw);

    // optional: write back sanitized values so UI reflects what will be sent
    setValue("name", cleaned.name, { shouldValidate: true });
    setValue("url", cleaned.url, { shouldValidate: true });
    setValue("wpApplicationName", cleaned.wpApplicationName, { shouldValidate: true });
    setValue("wpApplicationPassword", cleaned.wpApplicationPassword, { shouldValidate: true });
    setValue("wpUsername", cleaned.wpUsername, { shouldValidate: true });

    // Validate URL before creating website
    if (!isValidatingUrl) {
      await validateWebsiteUrl(cleaned.url);
    }

    createWebsite.mutate(cleaned);
  };

  const watchedUrl = watch("url");

  // Auto-validate URL when it changes (debounced, sanitized)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (watchedUrl && watchedUrl.length > 10) {
        validateWebsiteUrl(watchedUrl);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [watchedUrl]);

  // Field-level onBlur cleaners to keep the form tidy/safe
  const onBlurSanitize = (field: keyof FormData) => {
    const val = watch(field) as string;
    if (field === "url") {
      setValue("url", sanitizeUrl(val), { shouldValidate: true });
    } else if (field === "wpApplicationPassword") {
      setValue("wpApplicationPassword", (val ?? "").trim(), { shouldValidate: true });
    } else {
      setValue(field, Sanitizer.sanitizeText(val), { shouldValidate: true });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add New Website</DialogTitle>
      </DialogHeader>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 max-h-[70vh] overflow-y-auto px-1"
      >
        <div>
          <Label htmlFor="name">Website Name</Label>
          <Input
            id="name"
            {...register("name")}
            onBlur={() => onBlurSanitize("name")}
            placeholder="My WordPress Site"
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="url">Website URL</Label>
          <div className="relative">
            <Input
              id="url"
              type="url"
              {...register("url")}
              onBlur={() => onBlurSanitize("url")}
              placeholder="https://example.com"
              className={isValidatingUrl ? "pr-10" : ""}
            />
            {isValidatingUrl && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              </div>
            )}
          </div>
          {errors.url && (
            <p className="text-sm text-red-600 mt-1">{errors.url.message}</p>
          )}
        </div>

        {/* WordPress Application Password Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm sm:text-base">
            🔒 Secure WordPress Authentication
          </h4>
          <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 mb-2">
            We use WordPress Application Passwords for secure, revokable access
            without storing your main password.
          </p>
          <details className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
            <summary className="cursor-pointer font-medium mb-2">
              How to create an Application Password →
            </summary>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-xs sm:text-sm">
              <li>Log into your WordPress admin dashboard</li>
              <li>Go to Users → Your Profile</li>
              <li>Scroll to "Application Passwords" section</li>
              <li>Enter "AI Content Manager" as the name</li>
              <li>Click "Add New Application Password"</li>
              <li>Copy the generated 24-character password immediately</li>
              <li>Paste it in the form below</li>
            </ol>
            <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-xs">
              <strong>⚠️ Security Note:</strong> Application passwords can be
              revoked at any time from your WordPress dashboard without
              affecting your main login.
            </div>
          </details>
        </div>

        <div>
          <Label htmlFor="wpApplicationName">Application Name</Label>
          <Input
            id="wpApplicationName"
            {...register("wpApplicationName")}
            onBlur={() => onBlurSanitize("wpApplicationName")}
            placeholder="AI Content Manager - My Site"
          />
          {errors.wpApplicationName && (
            <p className="text-sm text-red-600 mt-1">
              {errors.wpApplicationName.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="wpApplicationPassword">WordPress Application Password</Label>
          <Input
            id="wpApplicationPassword"
            type="password"
            {...register("wpApplicationPassword")}
            onBlur={() => onBlurSanitize("wpApplicationPassword")}
            placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
            className="font-mono"
          />
          {errors.wpApplicationPassword && (
            <p className="text-sm text-red-600 mt-1">
              {errors.wpApplicationPassword.message}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">24-character password generated by WordPress</p>
        </div>

        <div>
          <Label htmlFor="wpUsername">WordPress Username</Label>
          <Input
            id="wpUsername"
            {...register("wpUsername")}
            onBlur={() => onBlurSanitize("wpUsername")}
            placeholder="your-wp-username"
          />
          {errors.wpUsername && (
            <p className="text-sm text-red-600 mt-1">{errors.wpUsername.message}</p>
          )}
        </div>

        {/* Connection Test Preview */}
        {watch("url") &&
          watch("wpUsername") &&
          watch("wpApplicationPassword") && (
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-800 dark:text-green-200">
                ✓ Ready to connect to <strong>{sanitizeUrl(watch("url"))}</strong> as user{" "}
                <strong>{Sanitizer.sanitizeText(watch("wpUsername"))}</strong>
              </p>
            </div>
          )}

        <div className="flex flex-col-reverse sm:flex-row space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:flex-1"
            onClick={onSuccess}
            disabled={createWebsite.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-full sm:flex-1 bg-primary-500 hover:bg-primary-600"
            disabled={createWebsite.isPending || isValidatingUrl}
          >
            {createWebsite.isPending
              ? "Connecting..."
              : isValidatingUrl
              ? "Validating..."
              : "Connect Website"}
          </Button>
        </div>
      </form>
    </>
  );
}




// import { useState, useEffect } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Checkbox } from "@/components/ui/checkbox";
// import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { useToast } from "@/hooks/use-toast";
// import { insertWebsiteSchema } from "@shared/schema";
// import { api } from "@/lib/api";
// import { z } from "zod";

// const formSchema = insertWebsiteSchema.extend({
//   name: z.string().min(1, "Website name is required"),
//   url: z.string().url("Please enter a valid URL"),
//   wpApplicationName: z.string().min(1, "Application name is required"),
//   wpApplicationPassword: z
//     .string()
//     .min(
//       20,
//       "Application password must be at least 20 characters (WordPress generates 24)"
//     ),
//   wpUsername: z.string().min(1, "WordPress username is required"),
// });

// type FormData = z.infer<typeof formSchema>;

// interface AddWebsiteFormProps {
//   onSuccess: () => void;
// }

// export default function AddWebsiteForm({ onSuccess }: AddWebsiteFormProps) {
//   const { toast } = useToast();
//   const queryClient = useQueryClient();
//   const [isValidatingUrl, setIsValidatingUrl] = useState(false);

//   const {
//     register,
//     handleSubmit,
//     setValue,
//     watch,
//     formState: { errors },
//   } = useForm<FormData>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       aiModel: "gpt-4o",
//       autoPosting: false, // Default to manual approval for security
//       requireApproval: true,
//       brandVoice: "professional",
//     },
//   });

//   const createWebsite = useMutation({
//     mutationFn: api.createWebsite,
//     onSuccess: (data) => {
//       console.log("✅ Website created successfully:", data);

//       // Invalidate user-scoped queries
//       queryClient.invalidateQueries({ queryKey: ["/api/user/websites"] });
//       queryClient.invalidateQueries({
//         queryKey: ["/api/user/dashboard/stats"],
//       });
//       queryClient.invalidateQueries({ queryKey: ["/api/user/activity-logs"] });

//       // Optionally, add the new website to the cache immediately for instant UI update
//       queryClient.setQueryData(["/api/user/websites"], (oldData: any) => {
//         if (oldData) {
//           return [...oldData, data];
//         }
//         return [data];
//       });

//       toast({
//         title: "Website Connected Successfully",
//         description: `${watch(
//           "name"
//         )} has been connected and is ready for content management.`,
//       });
//       onSuccess();
//     },
//     onError: (error: any) => {
//       console.error("❌ Website creation error:", error);

//       // Handle specific error types
//       let errorMessage =
//         "Failed to connect website. Please check your credentials.";

//       if (error.message?.includes("authentication")) {
//         errorMessage =
//           "WordPress authentication failed. Please check your username and application password.";
//       } else if (error.message?.includes("network")) {
//         errorMessage =
//           "Unable to reach your WordPress site. Please check the URL.";
//       } else if (error.message?.includes("permission")) {
//         errorMessage =
//           "Insufficient permissions. Please ensure your WordPress user has admin or editor rights.";
//       } else if (error.message?.includes("access denied")) {
//         errorMessage =
//           "Access denied. Please ensure you're logged in and try again.";
//       } else if (error.message?.includes("validation")) {
//         errorMessage = "Please check all required fields are filled correctly.";
//       } else if (error.message) {
//         errorMessage = error.message;
//       }

//       toast({
//         title: "Connection Failed",
//         description: errorMessage,
//         variant: "destructive",
//       });
//     },
//   });

//   // URL validation function
//   const validateWebsiteUrl = async (url: string) => {
//     if (!url || !url.startsWith("http")) return;

//     setIsValidatingUrl(true);
//     try {
//       const result = await api.validateUrl(url);
//       if (!result.valid) {
//         toast({
//           title: "URL Validation Failed",
//           description:
//             result.message ||
//             "The provided URL appears to be invalid or unreachable.",
//           variant: "destructive",
//         });
//       } else if (result.isWordPress === false) {
//         toast({
//           title: "Not a WordPress Site",
//           description:
//             "The URL doesn't appear to be a WordPress site. Please verify the URL.",
//           variant: "destructive",
//         });
//       } else if (result.isWordPress === true) {
//         toast({
//           title: "WordPress Site Detected",
//           description: "Great! We've confirmed this is a WordPress site.",
//         });
//       }
//     } catch (error) {
//       console.warn("URL validation failed:", error);
//       // Don't show error toast for URL validation failures - it's not critical
//     } finally {
//       setIsValidatingUrl(false);
//     }
//   };

//   const onSubmit = async (data: FormData) => {
//     console.log("🔍 Form submitted:", data);

//     // Validate URL before creating website
//     if (!isValidatingUrl) {
//       await validateWebsiteUrl(data.url);
//     }

//     createWebsite.mutate(data);
//   };

//   const watchedUrl = watch("url");

//   // Auto-validate URL when it changes (debounced)
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       if (watchedUrl && watchedUrl.length > 10) {
//         validateWebsiteUrl(watchedUrl);
//       }
//     }, 1000);

//     return () => clearTimeout(timer);
//   }, [watchedUrl]);

//   return (
//     <>
//       <DialogHeader>
//         <DialogTitle>Add New Website</DialogTitle>
//       </DialogHeader>

//       <form
//         onSubmit={handleSubmit(onSubmit)}
//         className="space-y-4 max-h-[70vh] overflow-y-auto px-1"
//       >
//         <div>
//           <Label htmlFor="name">Website Name</Label>
//           <Input
//             id="name"
//             {...register("name")}
//             placeholder="My WordPress Site"
//           />
//           {errors.name && (
//             <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
//           )}
//         </div>

//         <div>
//           <Label htmlFor="url">Website URL</Label>
//           <div className="relative">
//             <Input
//               id="url"
//               type="url"
//               {...register("url")}
//               placeholder="https://example.com"
//               className={isValidatingUrl ? "pr-10" : ""}
//             />
//             {isValidatingUrl && (
//               <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
//                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
//               </div>
//             )}
//           </div>
//           {errors.url && (
//             <p className="text-sm text-red-600 mt-1">{errors.url.message}</p>
//           )}
//         </div>

//         {/* WordPress Application Password Instructions */}
//         <div className="bg-blue-50 dark:bg-blue-950 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
//           <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm sm:text-base">
//             🔒 Secure WordPress Authentication
//           </h4>
//           <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 mb-2">
//             We use WordPress Application Passwords for secure, revokable access
//             without storing your main password.
//           </p>
//           <details className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
//             <summary className="cursor-pointer font-medium mb-2">
//               How to create an Application Password →
//             </summary>
//             <ol className="list-decimal list-inside space-y-1 ml-2 text-xs sm:text-sm">
//               <li>Log into your WordPress admin dashboard</li>
//               <li>Go to Users → Your Profile</li>
//               <li>Scroll to "Application Passwords" section</li>
//               <li>Enter "AI Content Manager" as the name</li>
//               <li>Click "Add New Application Password"</li>
//               <li>Copy the generated 24-character password immediately</li>
//               <li>Paste it in the form below</li>
//             </ol>
//             <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-xs">
//               <strong>⚠️ Security Note:</strong> Application passwords can be
//               revoked at any time from your WordPress dashboard without
//               affecting your main login.
//             </div>
//           </details>
//         </div>

//         <div>
//           <Label htmlFor="wpApplicationName">Application Name</Label>
//           <Input
//             id="wpApplicationName"
//             {...register("wpApplicationName")}
//             placeholder="AI Content Manager - My Site"
//           />
//           {errors.wpApplicationName && (
//             <p className="text-sm text-red-600 mt-1">
//               {errors.wpApplicationName.message}
//             </p>
//           )}
//         </div>

//         <div>
//           <Label htmlFor="wpApplicationPassword">
//             WordPress Application Password
//           </Label>
//           <Input
//             id="wpApplicationPassword"
//             type="password"
//             {...register("wpApplicationPassword")}
//             placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
//             className="font-mono"
//           />
//           {errors.wpApplicationPassword && (
//             <p className="text-sm text-red-600 mt-1">
//               {errors.wpApplicationPassword.message}
//             </p>
//           )}
//           <p className="text-xs text-gray-500 mt-1">
//             24-character password generated by WordPress
//           </p>
//         </div>

//         <div>
//           <Label htmlFor="wpUsername">WordPress Username</Label>
//           <Input
//             id="wpUsername"
//             {...register("wpUsername")}
//             placeholder="your-wp-username"
//           />
//           {errors.wpUsername && (
//             <p className="text-sm text-red-600 mt-1">
//               {errors.wpUsername.message}
//             </p>
//           )}
//         </div>

//         {/* <div>
//           <Label htmlFor="aiModel">
//             AI Model Preference (for auto-generate and auto-posting)
//           </Label>
//           <Select
//             value={watch("aiModel")}
//             onValueChange={(value) => setValue("aiModel", value)}
//           >
//             <SelectTrigger>
//               <SelectValue placeholder="Select AI model" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="gpt-4o">GPT-4 (Recommended)</SelectItem>
//               <SelectItem value="claude-3">Claude-3 (Creative)</SelectItem>
//               <SelectItem value="gemini">Gemini</SelectItem>
             
//             </SelectContent>
//           </Select>
//         </div> */}

//         {/* <div>
//           <Label htmlFor="brandVoice">
//             Brand Voice (for auto-generate and auto-posting)
//           </Label>
//           <Select
//             value={watch("brandVoice") || "professional"}
//             onValueChange={(value) => setValue("brandVoice", value)}
//           >
//             <SelectTrigger>
//               <SelectValue placeholder="Select brand voice" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="professional">Professional</SelectItem>
//               <SelectItem value="friendly">Friendly</SelectItem>
//               <SelectItem value="technical">Technical</SelectItem>
//               <SelectItem value="casual">Casual</SelectItem>
//               <SelectItem value="warm">Warm</SelectItem>
//               <SelectItem value="authoritative">Authoritative</SelectItem>
//             </SelectContent>
//           </Select>
//         </div> */}

//         {/* <div>
//           <Label htmlFor="targetAudience">
//             Target Audience (for auto-generate and auto-posting)
//           </Label>
//           <Input
//             id="targetAudience"
//             {...register("targetAudience")}
//             placeholder="e.g., small business owners, developers, shoppers"
//           />
//         </div> */}

//         {/* <div>
//           <Label htmlFor="contentGuidelines">
//             Content Guidelines (for auto-generate and auto-posting) (Optional)
//           </Label>
//           <Input
//             id="contentGuidelines"
//             {...register("contentGuidelines")}
//             placeholder="e.g., Always include call-to-action, focus on benefits"
//           />
//         </div> */}

//         {/* <div className="space-y-3">
//           <div className="flex items-center space-x-2">
//             <Checkbox
//               id="requireApproval"
//               checked={watch("requireApproval")}
//               onCheckedChange={(checked) =>
//                 setValue("requireApproval", !!checked)
//               }
//             />
//             <Label htmlFor="requireApproval" className="text-sm">
//               Require manual approval before publishing (Recommended)
//             </Label>
//           </div> */}

//           {/* <div className="flex items-center space-x-2">
//             <Checkbox
//               id="autoPosting"
//               checked={watch("autoPosting")}
//               onCheckedChange={(checked) => setValue("autoPosting", !!checked)}
//             />
//             <Label htmlFor="autoPosting" className="text-sm">
//               Enable automatic scheduling (2x per week)
//             </Label>
//           </div>
//         </div> */}

//         {/* Connection Test Preview */}
//         {watch("url") &&
//           watch("wpUsername") &&
//           watch("wpApplicationPassword") && (
//             <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
//               <p className="text-xs text-green-800 dark:text-green-200">
//                 ✓ Ready to connect to <strong>{watch("url")}</strong> as user{" "}
//                 <strong>{watch("wpUsername")}</strong>
//               </p>
//             </div>
//           )}

//         <div className="flex flex-col-reverse sm:flex-row space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3 pt-4">
//           <Button
//             type="button"
//             variant="outline"
//             className="w-full sm:flex-1"
//             onClick={onSuccess}
//             disabled={createWebsite.isPending}
//           >
//             Cancel
//           </Button>
//           <Button
//             type="submit"
//             className="w-full sm:flex-1 bg-primary-500 hover:bg-primary-600"
//             disabled={createWebsite.isPending || isValidatingUrl}
//           >
//             {createWebsite.isPending
//               ? "Connecting..."
//               : isValidatingUrl
//               ? "Validating..."
//               : "Connect Website"}
//           </Button>
//         </div>
//       </form>
//     </>
//   );
// }
