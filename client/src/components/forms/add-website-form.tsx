import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { insertWebsiteSchema } from "@shared/schema";
import { api } from "@/lib/api";
import { z } from "zod";

const formSchema = insertWebsiteSchema.extend({
  name: z.string().min(1, "Website name is required"),
  url: z.string().url("Please enter a valid URL"),
  wpApplicationName: z.string().min(1, "Application name is required"),
  wpApplicationPassword: z.string().min(20, "Application password must be at least 20 characters (WordPress generates 24)"),
  wpUsername: z.string().min(1, "WordPress username is required"),
});

type FormData = z.infer<typeof formSchema>;

interface AddWebsiteFormProps {
  onSuccess: () => void;
}

export default function AddWebsiteForm({ onSuccess }: AddWebsiteFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      toast({
        title: "Website Connected",
        description: "Your WordPress site has been successfully connected.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect website. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createWebsite.mutate(data);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add New Website</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        <div>
          <Label htmlFor="name">Website Name</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="My WordPress Site"
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="url">Website URL</Label>
          <Input
            id="url"
            type="url"
            {...register("url")}
            placeholder="https://example.com"
          />
          {errors.url && (
            <p className="text-sm text-red-600 mt-1">{errors.url.message}</p>
          )}
        </div>
        
        {/* WordPress Application Password Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm sm:text-base">🔒 Secure WordPress Authentication</h4>
          <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 mb-2">
            We use WordPress Application Passwords for secure, revokable access without storing your main password.
          </p>
          <details className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
            <summary className="cursor-pointer font-medium mb-2">How to create an Application Password →</summary>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-xs sm:text-sm">
              <li>Log into your WordPress admin dashboard</li>
              <li>Go to Users → Your Profile</li>
              <li>Scroll to "Application Passwords" section</li>
              <li>Enter "AI Content Manager" as the name</li>
              <li>Click "Add New Application Password"</li>
              <li>Copy the generated 24-character password immediately</li>
              <li>Paste it in the form below</li>
            </ol>
          </details>
        </div>

        <div>
          <Label htmlFor="wpApplicationName">Application Name</Label>
          <Input
            id="wpApplicationName"
            {...register("wpApplicationName")}
            placeholder="AI Content Manager - My Site"
          />
          {errors.wpApplicationName && (
            <p className="text-sm text-red-600 mt-1">{errors.wpApplicationName.message}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="wpApplicationPassword">WordPress Application Password</Label>
          <Input
            id="wpApplicationPassword"
            type="password"
            {...register("wpApplicationPassword")}
            placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
            className="font-mono"
          />
          {errors.wpApplicationPassword && (
            <p className="text-sm text-red-600 mt-1">{errors.wpApplicationPassword.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">24-character password generated by WordPress</p>
        </div>
        
        <div>
          <Label htmlFor="wpUsername">WordPress Username</Label>
          <Input
            id="wpUsername"
            {...register("wpUsername")}
            placeholder="your-wp-username"
          />
          {errors.wpUsername && (
            <p className="text-sm text-red-600 mt-1">{errors.wpUsername.message}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="aiModel">AI Model Preference</Label>
          <Select
            value={watch("aiModel")}
            onValueChange={(value) => setValue("aiModel", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select AI model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4</SelectItem>
              <SelectItem value="claude-3">Claude-3</SelectItem>
              <SelectItem value="auto-select">Auto-Select</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="brandVoice">Brand Voice</Label>
          <Select
            value={watch("brandVoice") || "professional"}
            onValueChange={(value) => setValue("brandVoice", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select brand voice" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="authoritative">Authoritative</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="targetAudience">Target Audience</Label>
          <Input
            id="targetAudience"
            {...register("targetAudience")}
            placeholder="e.g., small business owners, developers, shoppers"
          />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="requireApproval"
              checked={watch("requireApproval")}
              onCheckedChange={(checked) => setValue("requireApproval", !!checked)}
            />
            <Label htmlFor="requireApproval" className="text-sm">
              Require manual approval before publishing (Recommended)
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoPosting"
              checked={watch("autoPosting")}
              onCheckedChange={(checked) => setValue("autoPosting", !!checked)}
            />
            <Label htmlFor="autoPosting" className="text-sm">
              Enable automatic scheduling (2x per week)
            </Label>
          </div>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:flex-1"
            onClick={onSuccess}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-full sm:flex-1 bg-primary-500 hover:bg-primary-600"
            disabled={createWebsite.isPending}
          >
            {createWebsite.isPending ? "Connecting..." : "Connect Website"}
          </Button>
        </div>
      </form>
    </>
  );
}
